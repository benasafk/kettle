/** Explicit, local-only live experiment using the existing provider and authored inputs. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { GenerationError, OpenAIGenerationProvider, type GenerationObservation } from '../packages/adapters/generation.ts';
import { EvaluationBudget } from '../packages/adapters/evaluation-budget.ts';
import { LiveBudgetLedger, readReservations, TOTAL_CAP_USD } from './live-budget.ts';
import { descriptionOnlyCases, livePlan, usageCostUpperEstimate } from './live-plan.ts';

const mode = process.argv.slice(2);
if (mode.length !== 1 || !['--preflight', '--live'].includes(mode[0]!)) {
  throw new Error('Use exactly --preflight (no network) or --live (paid requests).');
}
const ledgerPath = fileURLToPath(new URL('./live-reservations.jsonl', import.meta.url));
const inputs = descriptionOnlyCases();
const batchBound = inputs.length * livePlan.repeats * livePlan.reservation_usd_per_attempt;
const apiKey = process.env.OPENAI_API_KEY?.trim();
const preflight = {
  recorded_at: new Date().toISOString(), evidence: 'local_preflight_not_provider_observation',
  plan: livePlan, samples: inputs.length * livePlan.repeats, batch_reservation_ceiling_usd: batchBound,
  total_authorized_cap_usd: TOTAL_CAP_USD,
  prior_reservations_usd: readReservations(ledgerPath).reduce((sum, row) => sum + row.upper_bound_usd, 0),
  credentials: { openai: apiKey ? 'present_not_verified' : 'missing' },
  inputs, live_requests: 0, billed_cost_usd: null,
  reference_comparison: 'not_run: no specifically permitted external material supplied',
};
if (mode[0] === '--preflight') {
  writeFileSync(new URL('./results.preflight.json', import.meta.url), JSON.stringify(preflight, null, 2) + '\n');
  console.log(`Preflight only: OpenAI key ${apiKey ? 'present (unverified)' : 'missing'}; 8 samples; maximum $${batchBound.toFixed(2)} reservations. No network requests.`);
} else {
  if (!apiKey) throw new Error('OPENAI_API_KEY missing. Configure the development key locally; never paste it into chat. No request or reservation made.');
  if (new Date().toISOString().slice(0, 10) !== livePlan.pricing_checked_at) {
    throw new Error('Recheck the dated price/model bounds before a live run on another day.');
  }
  const ledger = new LiveBudgetLedger(ledgerPath);
  try {
    if (ledger.snapshot().remaining_unreserved_usd < batchBound) throw new Error('Insufficient aggregate budget for this batch.');
    const runId = randomUUID();
    const directory = new URL(`./live-results/${runId}/`, import.meta.url);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const save = (name: string, value: unknown) => writeFileSync(new URL(name, directory), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    save('plan.json', { ...preflight, run_id: runId, environment: { node: process.version, platform: process.platform } });
    const memoryBudget = new EvaluationBudget(batchBound);
    let stopped = false;
    for (let repeat = 1; repeat <= livePlan.repeats && !stopped; repeat++) {
      for (const sample of inputs) {
        const id = `${runId}:${sample.id}:${repeat}`;
        const name = `${sample.id}-${repeat}`;
        // Durable reservation precedes every request. A crash leaves it charged
        // against the cap; a lock left by a crash requires manual reconciliation.
        ledger.reserve({ id, provider: 'openai', upper_bound_usd: livePlan.reservation_usd_per_attempt });
        let observation: GenerationObservation | null = null;
        const provider = new OpenAIGenerationProvider({
          enabled: true, apiKey, model: livePlan.model, budget: memoryBudget,
          reserveUsdPerAttempt: livePlan.reservation_usd_per_attempt, maxAttempts: livePlan.max_attempts,
          maxOutputTokens: livePlan.max_output_tokens, timeoutMs: livePlan.timeout_ms,
          observe: value => { observation = value; },
          captureResponse: body => save(`${name}.response.json`, body),
        });
        let output = null;
        let failure = null;
        try { output = await provider.generateEvaluation(sample.input); }
        catch (error) { failure = error instanceof GenerationError ? error.code : 'LOCAL_FAILURE'; stopped = true; }
        const observed = observation as GenerationObservation | null;
        save(`${name}.json`, {
          reservation_id: id, ...sample, repeat, output, failure, observation: observed,
          usage_cost_upper_estimate_usd: usageCostUpperEstimate(observed?.input_tokens ?? null, observed?.output_tokens ?? null),
          billed_cost_usd: null, cost_basis: 'Published standard token rates; all input charged uncached. Not a billing receipt. Unknown failed-request cost remains reserved.',
          review: { status: 'pending', factual_integrity: 'pending', appropriate_reference_use: 'pending' },
          acknowledgement_ms: null, first_usable_idea_ms: null, refinement_ms: null,
        });
        console.log(`${name}: ${failure ?? 'generated; editorial review pending'}`);
        if (stopped) break; // Inspect failure before spending on further requests.
      }
    }
    save('summary.json', { run_id: runId, stopped_on_failure: stopped, ledger: ledger.snapshot() });
    console.log(`Inspect evals/live-results/${runId}/. Reservations remain in the aggregate ledger.`);
    if (stopped) process.exitCode = 1;
  } finally { ledger.close(); }
}
