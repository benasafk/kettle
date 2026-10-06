import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
// @ts-expect-error Build tooling is a Node ESM module, not part of the Worker.
import { buildPanel } from '../scripts/build-panel.mjs';

test('panel build bundles component code and removes stale output on missing/broken integration', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kettle-panel-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const panel = join(root, 'apps/panel');
  const output = join(panel, 'generated/project-review-bundle.ts');
  await mkdir(join(panel, 'generated'), { recursive: true });
  await writeFile(output, 'stale');
  assert.equal((await buildPanel(root)).status, 'not-integrated');
  await assert.rejects(readFile(output));
  await writeFile(join(panel, 'bridge.ts'), 'import { message } from "./project-review"; globalThis.rendered = message;');
  await assert.rejects(buildPanel(root), /requires/);
  await writeFile(join(panel, 'project-review.ts'), 'export const message = "</script><script>untrusted</script>";');
  assert.equal((await buildPanel(root)).status, 'built');
  const source = await readFile(output, 'utf8');
  const literal = source.split('export const projectReviewScript: string = ')[1]!.trim().slice(0, -1);
  const script = JSON.parse(literal);
  assert.doesNotMatch(script, /<\/script/i);
  const context: Record<string, unknown> = {};
  runInNewContext(script, context);
  assert.equal(context.rendered, '</script><script>untrusted</script>');
  await writeFile(join(panel, 'bridge.ts'), 'import "./missing";');
  await assert.rejects(buildPanel(root));
  await assert.rejects(readFile(output));
});
