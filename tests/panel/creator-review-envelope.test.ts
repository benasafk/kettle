import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creatorReviewOutput } from '../../apps/panel/creator-review-bridge.ts';
import { creatorDnaViewFixture } from '../../evals/creator-loop/dna-view-fixtures.ts';
import { creatorFailure } from '../../packages/application/creator-operations.ts';

test('bridge accepts only complete filtered structured output and rejects contradictory errors', () => {
  const output = { ok: true, data: { dna: creatorDnaViewFixture() } };
  assert.deepEqual(creatorReviewOutput({ structuredContent: output }), output);
  for (const raw of [null, output, { content: [{ type: 'text', text: JSON.stringify(output) }] },
    { _meta: output }, { structuredContent: output, isError: true },
    { structuredContent: { ...output, private_data: 'secret' } }]) {
    assert.equal(creatorReviewOutput(raw), undefined);
  }
  const denied = creatorFailure('UNAUTHENTICATED');
  assert.deepEqual(creatorReviewOutput({ structuredContent: denied, isError: true }), denied);
});
