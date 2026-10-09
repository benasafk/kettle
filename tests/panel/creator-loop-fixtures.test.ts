import test from 'node:test';
import assert from 'node:assert/strict';
import { CreatorAnalysis, ProfileScanResult } from '../../packages/contracts/creator-profile.ts';
import { fixtureState, scenarioNames } from '../../apps/panel/creator-loop/fixtures.ts';

test('creator review variants remain valid shared D0 fictional data', () => {
  for (const name of scenarioNames) {
    const state = fixtureState(name);
    if (state.kind === 'analysis') assert.equal(CreatorAnalysis.safeParse(state.analysis).success, true, name);
    if (state.kind === 'scan') assert.equal(ProfileScanResult.safeParse(state.scan).success, true, name);
  }
});
