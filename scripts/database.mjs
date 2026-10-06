import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { workspace } from './workspace.mjs';
const command = process.argv[2];
if (!['start', 'stop', 'reset', 'status', 'migrate'].includes(command) || process.argv.length !== 3) throw new Error('Use db:start, db:stop, db:reset db:status or db:migrate');
const ws = await workspace();
const directory = '.context/local-supabase';
await mkdir(`${directory}/supabase`, { recursive: true });
const config = (await readFile('supabase/config.template.toml', 'utf8'))
  .replaceAll('__PROJECT_ID__', ws.id)
  .replaceAll('__API_PORT__', String(ws.api_port))
  .replaceAll('__DB_PORT__', String(ws.db_port))
  .replaceAll('__SHADOW_PORT__', String(ws.shadow_port));
await writeFile(`${directory}/supabase/config.toml`, config);
await rm(`${directory}/supabase/migrations`, { recursive: true, force: true });
await cp('supabase/migrations', `${directory}/supabase/migrations`, { recursive: true });
await cp('supabase/seed.sql', `${directory}/supabase/seed.sql`);
const args = command === 'reset' ? ['db', 'reset', '--local'] : command === 'migrate' ? ['migration', 'up', '--local'] : [command];
// No arbitrary CLI passthrough, remote URL, linked project or shared config accepted.
const result = spawnSync('node_modules/.bin/supabase', [...args, '--workdir', directory], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
