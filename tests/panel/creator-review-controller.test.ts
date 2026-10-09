import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { creatorDnaViewFixture } from '../../evals/creator-loop/dna-view-fixtures.ts';
import { creatorFailure } from '../../packages/application/creator-operations.ts';
import type { CreatorDnaView } from '../../packages/contracts/creator-operations.ts';
import { createCreatorReviewController, creatorDnaText, type CreatorReviewObserver } from '../../apps/panel/creator-review-controller.ts';

function output(version = 1) {
  const dna = creatorDnaViewFixture();
  dna.version = version;
  dna.snapshot_id = `00000000-0000-4000-8000-${String(version + 200).padStart(12, '0')}`;
  return { ok: true as const, data: { dna } };
}
function harness(timeout = 1000) {
  const events: unknown[] = [];
  let visible: CreatorDnaView | undefined;
  let readState: Parameters<CreatorReviewObserver['saved']>[1] | undefined;
  const calls: { input: unknown; signal: AbortSignal; resolve(value: unknown): void; reject(error: unknown): void }[] = [];
  const controller = createCreatorReviewController({
    loading() { visible = undefined; events.push('loading'); },
    saved(dna, state) { visible = dna; readState = state; events.push(dna); },
    unavailable(reason) { visible = undefined; events.push(reason); },
  }, (input, signal) => new Promise((resolve, reject) => calls.push({ input, signal, resolve, reject })), timeout);
  return { controller, events, calls, visible: () => visible, state: () => readState,
    launch(value = output(), tools = true, version?: number) {
      controller.receiveInput({ dna_id: value.data.dna.dna_id, ...(version ? { version } : {}) });
      controller.receiveResult(value); controller.connected(tools);
    } };
}

test('launch requires matching input and handshake; no reread or polling, missing tools keeps saved content', async t => {
  const f = harness(); t.after(f.controller.dispose);
  const value = output();
  f.controller.receiveInput({ dna_id: value.data.dna.dna_id });
  f.controller.receiveResult(value);
  assert.equal(f.visible(), undefined);
  f.controller.connected(false);
  assert.deepEqual(f.visible(), value.data.dna);
  assert.equal(f.state()?.refreshAvailable, false);
  await f.controller.refresh();
  assert.equal(f.calls.length, 0);
});

test('refresh is read-only, suppresses duplicates, preserves exact selection and accepts equal/new versions', async t => {
  const f = harness(); t.after(f.controller.dispose); f.launch();
  const first = f.controller.refresh(); await f.controller.refresh();
  assert.equal(f.calls.length, 1); assert.equal(f.state()?.refreshing, true);
  assert.deepEqual(f.calls[0]!.input, { dna_id: output().data.dna.dna_id });
  f.calls[0]!.resolve(output()); await first;
  const second = f.controller.refresh(); f.calls[1]!.resolve(output(2)); await second;
  assert.equal(f.visible()?.version, 2); assert.equal(f.state()?.refreshing, false);
  f.controller.receiveResult(output(1));
  assert.equal(f.visible()?.version, 2); assert.match(f.state()?.warning ?? '', /older/);
});

test('historical reads preserve requested version and switching selection resets version domain', async t => {
  const f = harness(); t.after(f.controller.dispose); f.launch(output(3));
  const old = f.controller.refresh();
  f.controller.receiveInput({ dna_id: output().data.dna.dna_id, version: 1 });
  assert.equal(f.calls[0]!.signal.aborted, true);
  f.controller.receiveResult(output());
  f.calls[0]!.resolve(output(4)); await old;
  assert.equal(f.visible()?.version, 1);
  const refresh = f.controller.refresh();
  assert.deepEqual(f.calls[1]!.input, { dna_id: output().data.dna.dna_id, version: 1 });
  f.calls[1]!.resolve(output(2)); await refresh;
  assert.equal(f.visible(), undefined); assert.equal(f.events.at(-1), 'invalid');
});

for (const field of ['dna_id', 'project_id', 'source_scan_id', 'snapshot_id', 'profile'] as const) {
  test(`mismatched ${field} cannot replace saved association`, t => {
    const f = harness(); t.after(f.controller.dispose); f.launch();
    const value = output();
    if (field === 'profile') value.data.dna.profile.native_id = 'another-creator';
    else value.data.dna[field] = '00000000-0000-4000-8000-000000009999';
    f.controller.receiveResult(value);
    assert.equal(f.visible(), undefined); assert.equal(f.events.at(-1), 'invalid');
  });
}

test('new association accepts its own lower version; prior in-flight read cannot restore old data', async t => {
  const f = harness(); t.after(f.controller.dispose); f.launch(output(4));
  const pending = f.controller.refresh();
  const other = output(); other.data.dna.dna_id = '00000000-0000-4000-8000-000000009999';
  f.controller.receiveInput({ dna_id: other.data.dna.dna_id }); f.controller.receiveResult(other);
  f.calls[0]!.resolve(output(5)); await pending;
  assert.equal(f.visible()?.dna_id, other.data.dna.dna_id); assert.equal(f.visible()?.version, 1);
});

for (const code of ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR', 'VERSION_CONFLICT', 'IDEMPOTENCY_CONFLICT'] as const) {
  test(`${code} clears private content and ignores late response until remount`, async t => {
    const f = harness(); t.after(f.controller.dispose); f.launch();
    const pending = f.controller.refresh();
    f.controller.receiveResult(creatorFailure(code));
    assert.equal(f.visible(), undefined); assert.equal(f.calls[0]!.signal.aborted, true);
    f.calls[0]!.resolve(output(2)); await pending;
    f.controller.receiveResult(output(3)); f.controller.receiveInput({ dna_id: output().data.dna.dna_id });
    await f.controller.refresh();
    assert.equal(f.visible(), undefined); assert.equal(f.calls.length, 1);
  });
}

test('transient failure/timeout retains saved view, explicit retry recovers, late timeout output ignored', async t => {
  const f = harness(10); t.after(f.controller.dispose); f.launch();
  const transient = f.controller.refresh(); f.calls[0]!.resolve(creatorFailure('UNAVAILABLE')); await transient;
  assert.equal(f.visible()?.version, 1); assert.match(f.state()?.warning ?? '', /failed/);
  await f.controller.refresh(); assert.equal(f.calls[1]!.signal.aborted, true);
  assert.match(f.state()?.warning ?? '', /timed out/);
  const retry = f.controller.refresh(); f.calls[2]!.resolve(output(2)); await retry;
  f.calls[1]!.resolve(output(3)); await delay(0);
  assert.equal(f.visible()?.version, 2);
});

test('unknown rejection, connection loss and malformed public output clear instead of trusting old data', async t => {
  for (const action of ['reject', 'disconnect', 'raw', 'version'] as const) {
    const f = harness(); t.after(f.controller.dispose); f.launch();
    if (action === 'reject') { const p = f.controller.refresh(); f.calls[0]!.reject(new Error('host denied')); await p; }
    else if (action === 'disconnect') f.controller.connectionFailed();
    else if (action === 'raw') f.controller.receiveResult({ ...output(), account_id: 'claimed-owner' });
    else { const value = output(); value.data.dna.version = 0; f.controller.receiveResult(value); }
    assert.equal(f.visible(), undefined);
  }
});

test('invalid selection and result without selection fail closed', t => {
  for (const input of [{ dna_id: 'bad' }, { dna_id: output().data.dna.dna_id, account_id: 'caller' }]) {
    const f = harness(); t.after(f.controller.dispose); f.controller.receiveInput(input);
    assert.equal(f.events.at(-1), 'invalid');
  }
  const f = harness(); t.after(f.controller.dispose); f.controller.receiveResult(output());
  assert.equal(f.events.at(-1), 'invalid');
});

test('initial read deadline and disposal stop all late rendering', async () => {
  const f = harness(5); f.controller.receiveInput({ dna_id: output().data.dna.dna_id });
  await delay(15); assert.equal(f.events.at(-1), 'connection');
  f.controller.dispose();
  const g = harness(); g.launch(); const pending = g.controller.refresh();
  g.controller.dispose(); const count = g.events.length;
  g.calls[0]!.resolve(output(2)); await pending;
  g.controller.connected(true); g.controller.receiveResult(output()); await g.controller.refresh();
  assert.equal(g.events.length, count); assert.equal(g.calls[0]!.signal.aborted, true);
});

test('full text fallback preserves all public content/limits/unknown metrics and rejects internal fields', () => {
  const value = output(); value.data.dna.scan_status = 'partial';
  value.data.dna.withheld_claim_count = 2;
  value.data.dna.claims[0]!.statement = '<script>untrusted text</script>';
  assert.deepEqual(JSON.parse(creatorDnaText(value)), value);
  assert.equal(JSON.parse(creatorDnaText(value)).data.dna.evidence[0].metrics.comments, null);
  assert.throws(() => creatorDnaText({ ok: true, data: { ...value.data, analysis: {} } }));
  assert.throws(() => creatorDnaText({ ok: true, data: { dna: { ...value.data.dna, cost: {} } } }));
  assert.deepEqual(JSON.parse(creatorDnaText(creatorFailure('UNAUTHENTICATED'))), creatorFailure('UNAUTHENTICATED'));
});


test('new authoritative result invalidates refresh and partial views preserve all filtered fields', async t => {
  const f = harness(); t.after(f.controller.dispose); f.launch();
  const pending = f.controller.refresh();
  const value = output(2); value.data.dna.scan_status = 'partial';
  value.data.dna.withheld_claim_count = 3;
  value.data.dna.limitations.push('Some claims cannot be displayed.');
  f.controller.receiveResult(value);
  assert.equal(f.calls[0]!.signal.aborted, true);
  f.calls[0]!.resolve(output(3)); await pending;
  assert.deepEqual(f.visible(), value.data.dna);
  assert.equal(f.state()?.refreshing, false);
});
