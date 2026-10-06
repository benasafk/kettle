import { spawn } from 'node:child_process';
import { workspace } from './workspace.mjs';
const config = await workspace();
const child = spawn('node_modules/.bin/wrangler', [
  'dev', '--local', '--ip', '127.0.0.1', '--port', String(config.port),
  '--inspector-port', String(config.inspector_port), '--persist-to', '.context/workerd',
], { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 0));
