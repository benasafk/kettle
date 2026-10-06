import test from 'node:test';
import assert from 'node:assert/strict';
import { Project } from '../../packages/contracts/index.ts';
import { project, emptyProject, longProject, hostileProject } from '../../apps/panel/fixtures/projects.ts';

test('every preview fixture satisfies the authoritative saved-project contract', () => {
  for (const fixture of [project, emptyProject, longProject, hostileProject]) {
    assert.equal(Project.safeParse(fixture).success, true);
  }
});
