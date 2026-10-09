import test from 'node:test';
import assert from 'node:assert/strict';
import { CreatorJobView } from '../../packages/contracts/creator-pipeline.ts';
import { pipelineFixture, scenarioNames } from '../../apps/panel/creator-pipeline/fixtures.ts';
test('pipeline previews use valid shared fictional contracts', () => {
  for (const name of scenarioNames) assert.equal(CreatorJobView.safeParse(pipelineFixture(name)).success, true, name);
});
