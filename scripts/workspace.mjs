import { createHash } from 'node:crypto';
import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function workspace() {
  const root = await realpath(process.cwd());
  const hash = createHash('sha256').update(root).digest('hex').slice(0, 12);
  // Stable fallback blocks of ten; collisions fail at bind, never reuse a DB ID.
  const base = Number(process.env.CONDUCTOR_PORT || process.env.KETTLE_PORT || (20000 + (parseInt(hash.slice(0, 6), 16) % 3000) * 10));
  if (!Number.isInteger(base) || base < 1024 || base > 65526) throw new Error('Invalid workspace port block');
  const config = { root, id: `kettle-${hash}`, port: base, inspector_port: base + 1,
    api_port: base + 2, db_port: base + 3, shadow_port: base + 4 };
  await mkdir('.context', { recursive: true });
  await writeFile('.context/workspace.json', JSON.stringify(config, null, 2) + '\n');
  return config;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = await workspace();
  console.log(`Workspace ${config.id}: http://127.0.0.1:${config.port} (database setup is opt-in)`);
}
