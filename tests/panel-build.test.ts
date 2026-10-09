import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
// @ts-expect-error Build tooling is a Node ESM module, not part of the Worker.
import { buildPanel } from '../scripts/build-panel.mjs';

for (const kind of ['project', 'creator']) test(`${kind} panel build bundles component code and removes stale output on missing/broken integration`, async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kettle-panel-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const name = kind === 'creator' ? 'creator-review' : 'project-review';
  const bridge = kind === 'creator' ? 'creator-review-bridge.ts' : 'bridge.ts';
  const symbol = kind === 'creator' ? 'creatorReviewScript' : 'projectReviewScript';
  const panel = join(root, 'apps/panel');
  const output = join(panel, `generated/${name}-bundle.ts`);
  await mkdir(join(panel, 'generated'), { recursive: true });
  await writeFile(output, 'stale');
  assert.equal((await buildPanel(root, kind)).status, 'not-integrated');
  await assert.rejects(readFile(output));
  await writeFile(join(panel, bridge), `import { message } from './${name}'; globalThis.rendered = message;`);
  await assert.rejects(buildPanel(root, kind), /requires/);
  await writeFile(join(panel, `${name}.ts`), 'export const message = "</script><script>untrusted</script>";');
  assert.equal((await buildPanel(root, kind)).status, 'built');
  const source = await readFile(output, 'utf8');
  const literal = source.split(`export const ${symbol}: string = `)[1]!.trim().slice(0, -1);
  const script = JSON.parse(literal);
  assert.doesNotMatch(script, /<\/script/i);
  const context: Record<string, unknown> = {};
  runInNewContext(script, context);
  assert.equal(context.rendered, '</script><script>untrusted</script>');
  await writeFile(join(panel, bridge), 'import "./missing";');
  await assert.rejects(buildPanel(root, kind));
  await assert.rejects(readFile(output));
});
