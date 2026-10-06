import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GetAccountStateInput, GetProjectInput, SaveProjectInput, Brief } from '../packages/contracts/index.ts';
import { noReferenceFixture } from '../packages/adapters/providers.ts';
import { createInput } from './fixtures.ts';

test('description-only input is valid; ownership and unknown fields are rejected', () => {
  const input = createInput();
  assert.ok(SaveProjectInput.safeParse(input).success);
  assert.equal(SaveProjectInput.safeParse({ ...input, account_id: crypto.randomUUID() }).success, false);
  assert.equal(GetAccountStateInput.safeParse({ account_id: crypto.randomUUID() }).success, false);
  assert.equal(GetProjectInput.safeParse({ project_id: 'not-a-uuid' }).success, false);
});
test('bounds and create/update version combinations are enforced', () => {
  const input = createInput();
  for (const change of [
    { expected_version: 1 }, { project_id: crypto.randomUUID() },
    { name: ' ' }, { name: 'x'.repeat(121) },
    { brief: { ...input.brief, duration_seconds: 181 } },
    { brief: { ...input.brief, product: ' ' } },
  ]) assert.equal(SaveProjectInput.safeParse({ ...input, ...change }).success, false);
  assert.ok(SaveProjectInput.safeParse({ ...input, project_id: crypto.randomUUID(), expected_version: 1 }).success);
});
test('facts have provenance, unique IDs and safe URL syntax', () => {
  const input = createInput();
  const fact = { id: crypto.randomUUID(), statement: 'Three settings', user_confirmed: false,
    source: { kind: 'url', url: 'https://example.com/lamp', captured_at: '2026-10-06T00:00:00Z' } };
  assert.ok(Brief.safeParse({ ...input.brief, facts: [fact] }).success);
  assert.equal(Brief.safeParse({ ...input.brief, facts: [fact, fact] }).success, false);
  for (const url of ['javascript:alert(1)', 'https://secret@example.com']) {
    assert.equal(Brief.safeParse({ ...input.brief, facts: [{ ...fact, source: { ...fact.source, url } }] }).success, false);
  }
});
test('no-match fixture is explicit and never fabricates live references', async () => {
  const output = await noReferenceFixture.search(createInput().brief);
  assert.equal(output.status, 'no_match');
  assert.equal(output.provenance, 'fixture');
  assert.deepEqual(output.references, []);
});
