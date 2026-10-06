import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { LiveBudgetLedger, readReservations } from '../evals/live-budget.ts';
import { descriptionOnlyCases, livePlan, usageCostUpperEstimate } from '../evals/live-plan.ts';

function withLedger(action: (path: string) => void) {
  const directory = mkdtempSync(join(tmpdir(), 'kettle-budget-'));
  const path = join(directory, 'ledger.jsonl');
  writeFileSync(path, '');
  try { action(path); } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('live reservations survive restarts and share one cap across all candidate providers', () => withLedger(path => {
  const first = new LiveBudgetLedger(path);
  try {
    first.reserve({ id: '1', provider: 'openai', upper_bound_usd: 10 });
    assert.throws(() => new LiveBudgetLedger(path), /EEXIST/);
    assert.throws(() => first.reserve({ id: '1', provider: 'openai', upper_bound_usd: 1 }), /Duplicate/);
  } finally { first.close(); }
  const restarted = new LiveBudgetLedger(path);
  try {
    assert.equal(restarted.snapshot().reserved_usd, 10);
    restarted.reserve({ id: '2', provider: 'lightreel', upper_bound_usd: 5 });
    restarted.reserve({ id: '3', provider: 'scrapecreators', upper_bound_usd: 5 });
    restarted.reserve({ id: '4', provider: 'ensembledata', upper_bound_usd: 5 });
    assert.equal(restarted.snapshot().remaining_unreserved_usd, 0);
    assert.throws(() => restarted.reserve({ id: '5', provider: 'openai', upper_bound_usd: 0.000001 }), /exhausted/);
    assert.equal(readReservations(path).length, 4);
  } finally { restarted.close(); }
}));

test('missing, corrupt, partial and duplicate reservation history fails closed', () => withLedger(path => {
  for (const data of ['{', '{}\n', '{"type":"reservation"}\n']) {
    writeFileSync(path, data);
    assert.throws(() => new LiveBudgetLedger(path));
  }
  writeFileSync(path, '');
  const ledger = new LiveBudgetLedger(path);
  ledger.reserve({ id: '1', provider: 'openai', upper_bound_usd: 0.5 });
  ledger.close();
  const line = readFileSync(path, 'utf8');
  writeFileSync(path, line + line);
  assert.throws(() => new LiveBudgetLedger(path), /Duplicate/);
  rmSync(path);
  assert.throws(() => new LiveBudgetLedger(path), /ENOENT/);
}));

test('live plan sends only fictional description text and safely overbounds full-context token cost', () => {
  const samples = descriptionOnlyCases();
  assert.deepEqual(samples.map(sample => sample.id), ['B01-description', 'B02-silent', 'B03-description', 'B05-revised']);
  assert.doesNotMatch(JSON.stringify(samples), /https?:|fixture_only|untrusted_reference_data/);
  assert.equal(samples[3]?.input.brief_version, 2);
  assert.ok(livePlan.calculated_bound_usd < livePlan.reservation_usd_per_attempt);
  assert.equal(samples.length * livePlan.repeats * livePlan.reservation_usd_per_attempt, 4);
  assert.equal(usageCostUpperEstimate(null, 1), null);
  assert.equal(usageCostUpperEstimate(1000000, 1000000), 2);
});

test('live CLI cannot spend implicitly or without credentials and does not reserve on those failures', () => {
  const path = new URL('../evals/live-reservations.jsonl', import.meta.url);
  const before = readFileSync(path, 'utf8');
  for (const args of [[], ['--unknown'], ['--live']]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'evals/run-live.ts', ...args], {
      cwd: new URL('../', import.meta.url), env: { ...process.env, OPENAI_API_KEY: '' }, encoding: 'utf8', timeout: 10000,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, args[0] === '--live' ? /OPENAI_API_KEY missing/ : /Use exactly/);
  }
  assert.equal(readFileSync(path, 'utf8'), before);
});

test('actual billed costs remain distinct from estimates and do not release reservations', () => withLedger(path => {
  const ledger = new LiveBudgetLedger(path);
  try {
    assert.equal(ledger.snapshot().billed_cost_usd, 0);
    ledger.reserve({ id: 'openai-1', provider: 'openai', upper_bound_usd: 0.5 });
    ledger.reserve({ id: 'reference-1', provider: 'scrapecreators', upper_bound_usd: 0.5 });
    assert.equal(ledger.snapshot().billed_cost_usd, null);
    assert.equal(ledger.snapshot().unreconciled_reservations, 2);
    assert.throws(() => ledger.recordBilledCost({ reservation_id: 'unknown', actual_usd: 0.01, receipt_reference: 'fictional-receipt' }), /Unknown/);
    ledger.recordBilledCost({ reservation_id: 'openai-1', actual_usd: 0.01, receipt_reference: 'fictional-unit-test-receipt-1' });
    assert.equal(ledger.snapshot().known_billed_usd, 0.01);
    assert.equal(ledger.snapshot().billed_cost_usd, null);
    assert.throws(() => ledger.recordBilledCost({ reservation_id: 'openai-1', actual_usd: 0.01, receipt_reference: 'fictional-unit-test-receipt-1' }), /Duplicate/);
    ledger.recordBilledCost({ reservation_id: 'reference-1', actual_usd: 0, receipt_reference: 'fictional-unit-test-free-credit-receipt' });
    assert.equal(ledger.snapshot().billed_cost_usd, 0.01);
    assert.equal(ledger.snapshot().remaining_unreserved_usd, 24);
  } finally { ledger.close(); }
  const reopened = new LiveBudgetLedger(path);
  try { assert.equal(reopened.snapshot().billed_cost_usd, 0.01); } finally { reopened.close(); }
}));

test('a receipt exceeding its bound is preserved and stops all further provider reservations', () => withLedger(path => {
  const ledger = new LiveBudgetLedger(path);
  try {
    ledger.reserve({ id: '1', provider: 'openai', upper_bound_usd: 0.5 });
    ledger.recordBilledCost({ reservation_id: '1', actual_usd: 0.75, receipt_reference: 'fictional-unit-test-overage' });
    assert.equal(ledger.snapshot().known_billed_usd, 0.75);
    assert.equal(ledger.snapshot().reservation_bound_breached, true);
    assert.equal(ledger.snapshot().remaining_unreserved_usd, 24.25);
    assert.throws(() => ledger.reserve({ id: '2', provider: 'ensembledata', upper_bound_usd: 0.5 }), /Bangkok/);
  } finally { ledger.close(); }
}));
