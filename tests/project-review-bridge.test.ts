import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createProjectReviewController } from '../apps/panel/bridge.ts';
import type { ProjectReviewState } from '../apps/panel/project-review.ts';
import { Project } from '../packages/contracts/index.ts';
import { failure } from '../packages/application/operations.ts';
import { createInput } from './fixtures.ts';

const projectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function result(version = 1, id = projectId) {
  const input = createInput();
  return { structuredContent: { ok: true, data: { project: Project.parse({
    id, name: input.name, project_type: 'brand', current_version: version,
    created_at: '2026-10-06T00:00:00Z', updated_at: '2026-10-06T00:00:00Z',
    brief_version: { id: crypto.randomUUID(), project_id: id, version, name: input.name,
      brief: input.brief, created_at: '2026-10-06T00:00:00Z' },
  }) } } };
}
function fixture(timeout = 1000) {
  const states: ProjectReviewState[] = [];
  const calls: { id: string; signal: AbortSignal; resolve: (value: unknown) => void; reject: (error: unknown) => void }[] = [];
  const controller = createProjectReviewController((s) => states.push(s), (id, signal) =>
    new Promise((resolve, reject) => { calls.push({ id, signal, resolve, reject }); }), timeout);
  return { controller, states, calls,
    last: () => states.at(-1)!,
    launch: (value = result()) => { controller.connected(true); controller.receiveInput({ project_id: value.structuredContent.data.project.id }); controller.receiveResult(value); },
  };
}
function readyState(state: ProjectReviewState) {
  assert.ok(state.kind === 'ready'); return state;
}
function errorState(state: ProjectReviewState) {
  assert.ok(state.kind === 'error'); return state;
}
function version(state: ProjectReviewState) {
  assert.equal(state.kind, 'ready');
  return state.kind === 'ready' ? state.project.current_version : 0;
}

test('launch uses the complete result with no duplicate read; waits for handshake and capability', async (t) => {
  const f = fixture(); t.after(() => f.controller.dispose());
  const value = result();
  assert.deepEqual(f.last(), { kind: 'loading' });
  f.controller.receiveInput({ project_id: projectId });
  f.controller.receiveResult(value);
  await f.controller.refresh();
  assert.equal(f.calls.length, 0);
  assert.equal(f.last().kind, 'loading');
  f.controller.connected(true);
  assert.deepEqual(f.last(), { kind: 'ready', project: value.structuredContent.data.project, refreshing: false });
  assert.equal(f.calls.length, 0);
});

test('explicit refresh binds ID, suppresses duplicates and accepts same or newer versions', async (t) => {
  const f = fixture(); t.after(() => f.controller.dispose()); f.launch();
  for (const next of [1, 2]) {
    const work = f.controller.refresh();
    assert.equal(readyState(f.last()).refreshing, true);
    const count = f.calls.length;
    await f.controller.refresh();
    assert.equal(f.calls.length, count);
    assert.equal(f.calls.at(-1)!.id, projectId);
    f.calls.at(-1)!.resolve(result(next));
    await work;
    assert.equal(version(f.last()), next);
    assert.equal(readyState(f.last()).refreshing, false);
  }
});

test('lower versions never replace the snapshot, including delayed host notifications', async (t) => {
  const f = fixture(); t.after(() => f.controller.dispose()); f.launch(result(3));
  const work = f.controller.refresh(); f.calls[0]!.resolve(result(2)); await work;
  assert.equal(version(f.last()), 3);
  f.controller.receiveResult(result(1));
  assert.equal(version(f.last()), 3);
});

test('new host result cancels an older refresh; obsolete success/failure cannot replace it', async (t) => {
  const f = fixture(); t.after(() => f.controller.dispose()); f.launch();
  const work = f.controller.refresh();
  f.controller.receiveResult(result(3));
  assert.equal(f.calls[0]!.signal.aborted, true);
  f.calls[0]!.resolve({ structuredContent: failure('UNAUTHENTICATED'), isError: true });
  await work;
  assert.equal(version(f.last()), 3);
});

test('explicit project change cancels refresh and requires the matching snapshot', async (t) => {
  const f = fixture(); t.after(() => f.controller.dispose()); f.launch();
  const work = f.controller.refresh();
  f.controller.receiveInput({ project_id: otherId });
  assert.equal(f.last().kind, 'loading');
  f.controller.receiveResult(result(1, otherId));
  f.calls[0]!.resolve(result(5)); await work;
  assert.equal(readyState(f.last()).project.id, otherId);
  const refresh = f.controller.refresh();
  assert.equal(f.calls[1]!.id, otherId);
  f.calls[1]!.resolve(result(2)); await refresh;
  assert.equal(f.last().kind, 'error', 'mismatched project payload clears private data');
});

for (const code of ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR', 'VERSION_CONFLICT', 'IDEMPOTENCY_CONFLICT'] as const) {
  test(`${code} clears the snapshot and disables further refresh`, async (t) => {
    const f = fixture(); t.after(() => f.controller.dispose()); f.launch();
    const work = f.controller.refresh();
    f.calls[0]!.resolve({ structuredContent: failure(code), isError: true }); await work;
    assert.equal(f.last().kind, 'error');
    await f.controller.refresh(); assert.equal(f.calls.length, 1);
    if (code === 'UNAUTHENTICATED') assert.equal(errorState(f.last()).recovery, 'reauthorize');
    if (code === 'NOT_FOUND') assert.equal(errorState(f.last()).message, 'This project is unavailable.');
  });
}

test('UNAVAILABLE preserves previously loaded snapshot with explicit retry', async (t) => {
  const f = fixture(); t.after(() => f.controller.dispose()); f.launch(result(2));
  const work = f.controller.refresh();
  f.calls[0]!.resolve({ structuredContent: failure('UNAVAILABLE'), isError: true }); await work;
  assert.equal(version(f.last()), 2);
  assert.match(readyState(f.last()).warning ?? '', /Previously loaded/);
  const retry = f.controller.refresh(); f.calls[1]!.resolve(result(3)); await retry;
  assert.equal(version(f.last()), 3);
});

test('timeout aborts the pending call, allows retry and ignores its late completion', async (t) => {
  const f = fixture(15); t.after(() => f.controller.dispose()); f.launch();
  await f.controller.refresh();
  assert.equal(f.calls[0]!.signal.aborted, true);
  assert.equal(version(f.last()), 1);
  assert.match(readyState(f.last()).warning ?? '', /Previously loaded/);
  const retry = f.controller.refresh(); f.calls[1]!.resolve(result(3)); await retry;
  f.calls[0]!.resolve(result(2)); await delay(0);
  assert.equal(version(f.last()), 3);
});

for (const raw of [null, {}, { structuredContent: { ok: true, data: {} } }, { ...result(), isError: true }]) {
  test('invalid result envelope clears private content', (t) => {
    const f = fixture(); t.after(() => f.controller.dispose()); f.launch();
    f.controller.receiveResult(raw); assert.equal(f.last().kind, 'error');
  });
}

test('malformed launch selection and mismatched launch result are rejected', (t) => {
  const f = fixture(); t.after(() => f.controller.dispose()); f.launch();
  f.controller.receiveInput({ project_id: projectId, account_id: 'spoof' });
  assert.equal(f.last().kind, 'error');
  f.controller.receiveInput({ project_id: otherId });
  f.controller.receiveResult(result()); assert.equal(f.last().kind, 'error');
});

test('missing tool capability provides reopen guidance without an enabled refresh', async (t) => {
  const f = fixture(); t.after(() => f.controller.dispose());
  f.controller.receiveResult(result()); f.controller.connected(false);
  assert.equal(f.last().kind, 'error');
  assert.match(errorState(f.last()).message, /reopen/);
  await f.controller.refresh(); assert.equal(f.calls.length, 0);
});

test('initial timeout / lost bridge stop loading and ignore late results', async (t) => {
  const f = fixture(10); t.after(() => f.controller.dispose());
  await delay(20);
  assert.equal(f.last().kind, 'error');
  f.controller.connected(true); f.controller.receiveResult(result());
  assert.equal(f.last().kind, 'error');
  const g = fixture(); t.after(() => g.controller.dispose()); g.launch();
  g.controller.connectionFailed(); assert.equal(g.last().kind, 'error');
});

test('dispose aborts pending requests and prevents subsequent renders or reads', async () => {
  const f = fixture(); f.launch(); const work = f.controller.refresh();
  f.controller.dispose(); const count = f.states.length;
  assert.equal(f.calls[0]!.signal.aborted, true);
  f.calls[0]!.resolve(result(2)); await work;
  f.controller.receiveResult(result(3)); f.controller.connected(true); await f.controller.refresh();
  assert.equal(f.states.length, count); assert.equal(f.calls.length, 1);
});
