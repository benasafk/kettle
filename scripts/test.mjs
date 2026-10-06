import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const browser = process.argv.includes('--browser');
async function discover(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? discover(path) : [path];
  }));
  return files.flat().filter(path => path.endsWith(browser ? '.test.mjs' : '.test.ts')).sort();
}
const files = await discover('tests');
if (files.length === 0) {
  console.log(`No ${browser ? 'browser' : 'TypeScript'} test suites present.`);
} else {
  const result = spawnSync(process.execPath, [
    ...(browser ? [] : ['--import', 'tsx']), '--test', ...files,
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
