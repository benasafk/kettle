import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cases, fixtureProvider, inaccessibleProfile } from './fixtures.ts';
import { noReferenceFixture } from '../packages/adapters/providers.ts';
import { ProviderResultDraft } from '../packages/contracts/drafts.ts';
import { reviewFixture } from './fixture-reviews.ts';

// Deliberately no live switch. Model/provider credentials cannot make this command spend.
if (process.argv.length > 2) throw new Error('Fixture-only runner accepts no arguments.');
const results = [];
for (const fixture of cases) {
  const start = performance.now();
  const referenceStart = performance.now();
  const references = fixture.references.length ? ProviderResultDraft.parse({ status: 'matched', references: fixture.references.map(ref => ref.reference),
    limitations: ['Synthetic reference: media/transcript/metrics absent; freshness unknown.'], provenance: 'fixture', latency_ms: 0, cost_usd: 0, cost_is_estimate: false,
  }) : await noReferenceFixture.search(fixture.input.brief);
  const referenceMs = performance.now() - referenceStart;
  const generationStart = performance.now();
  const script = await fixtureProvider(fixture).generate(fixture.input);
  const generationMs = performance.now() - generationStart;
  results.push({ case: fixture.id, input: fixture.input, idea: fixture.idea, references, script, review: reviewFixture(fixture, script),
    observation: { provenance: 'fixture', provider: 'authored_fixture', model: null, fixture_version: 1, attempts: 1,
      acknowledgement_ms: null, acknowledgement_reason: 'In-process harness has no user-facing acknowledgement.',
      reference_ms: referenceMs, generation_ms: generationMs, total_ms: performance.now() - start,
      first_usable_idea_ms: null, refinement_ms: null, input_tokens: 0, output_tokens: 0,
      api_cost_usd: 0, cost_per_usable_live_reference_usd: null, cost_per_live_script_usd: null,
      missing_cost_components: ['Human authoring/review', 'Infrastructure allocation', 'No live model or reference observations'],
    },
  });
}
const output = resolve('evals/results.fixture.json');
await mkdir(resolve('evals'), { recursive: true });
await writeFile(output, JSON.stringify({ recorded_at: new Date().toISOString(), environment: { node: process.version, platform: process.platform },
  evidence: 'Authored fixture playback only; timings measure local validation/assembly, not provider latency or user experience.',
  results, inaccessible_profile: inaccessibleProfile,
  baseline: { status: 'not_run', reason: 'Await approved real briefs and user-supplied plain ChatGPT outputs/account access.' },
}, null, 2) + '\n');
console.log(`PASS: ${results.length} fixture scripts and one inaccessible-profile fallback. API spend $0. Results: ${output}`);
