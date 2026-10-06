/** Opt-in LIVE development test. Creates and cleans up two fictional accounts.
 * Requires explicit project ref, existing migrations, and Supabase CLI login.
 * API keys stay in process memory; they are never written to disk or printed. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { createOperations } from '../packages/application/operations.ts';
import { createSupabaseRepository } from '../packages/database/supabase.ts';
import { SaveProjectOutput, GetProjectOutput, GetAccountStateOutput } from '../packages/contracts/index.ts';
import { createInput } from '../tests/fixtures.ts';

const run = promisify(execFile);
const project = process.env.KETTLE_TEST_PROJECT_REF;
assert.ok(project && /^[a-z]{20}$/.test(project), 'Set KETTLE_TEST_PROJECT_REF to the explicitly authorized development project');
assert.equal((await readFile('supabase/.temp/project-ref', 'utf8')).trim(), project, 'Test target must match the linked project');
async function cli(args: string[]) {
  try {
    return (await run('node_modules/.bin/supabase', args, { timeout: 60_000, maxBuffer: 2 * 1024 * 1024 })).stdout;
  } catch {
    throw new Error('Supabase CLI failed; check login and linked development access. Output suppressed to protect credentials.');
  }
}
async function sql(query: string) {
  return JSON.parse(await cli(['db', 'query', '--linked', query, '--agent', 'no', '--output-format', 'json']));
}
const keys = JSON.parse(await cli(['projects', 'api-keys', '--project-ref', project, '--output', 'json'])) as { name: string; api_key: string }[];
const serviceKey = keys.find((key) => key.name === 'service_role')?.api_key;
const anonKey = keys.find((key) => key.name === 'anon')?.api_key;
assert.ok(serviceKey && anonKey, 'Legacy server/anonymous keys required by the current adapter');
const base = `https://${project}.supabase.co`;
const a = crypto.randomUUID();
const b = crypto.randomUUID();
const repository = createSupabaseRepository(base, serviceKey);
const ops = createOperations({ async verify(token) {
  // Test-only principal injection; this does NOT verify real OAuth or sessions.
  if (token !== 'fixture-a' && token !== 'fixture-b') return null;
  return { account_id: token === 'fixture-a' ? a : b, scopes: ['account:read', 'projects:read', 'projects:write'] };
} }, repository);
const started = performance.now();
try {
  await sql(`insert into public.accounts(id, display_name) values ('${a}', 'Temporary fictional smoke A'), ('${b}', 'Temporary fictional smoke B');`);
  const account = GetAccountStateOutput.parse(await ops.execute('get_account_state', 'fixture-a', {}));
  assert.ok(account.ok);
  assert.equal(account.data.account.id, a);
  const input = createInput();
  const saved = SaveProjectOutput.parse(await ops.execute('save_project', 'fixture-a', input));
  assert.ok(saved.ok, JSON.stringify(saved));
  const id = saved.data.project.id;
  const read = GetProjectOutput.parse(await ops.execute('get_project', 'fixture-a', { project_id: id }));
  assert.ok(read.ok);
  assert.deepEqual(read.data.project, saved.data.project);
  const update = { ...input, request_id: crypto.randomUUID(), project_id: id, expected_version: 1, name: 'Updated fictional smoke' };
  const updated = SaveProjectOutput.parse(await ops.execute('save_project', 'fixture-a', update));
  assert.ok(updated.ok);
  assert.equal(updated.data.project.current_version, 2);
  assert.deepEqual(await ops.execute('save_project', 'fixture-a', input), saved);
  const stale = await ops.execute('save_project', 'fixture-a', { ...update, request_id: crypto.randomUUID() });
  assert.ok(!stale.ok && stale.error.code === 'VERSION_CONFLICT');
  const changed = await ops.execute('save_project', 'fixture-a', { ...input, name: 'Different content' });
  assert.ok(!changed.ok && changed.error.code === 'IDEMPOTENCY_CONFLICT');
  const deniedRead = await ops.execute('get_project', 'fixture-b', { project_id: id });
  const deniedWrite = await ops.execute('save_project', 'fixture-b', update);
  assert.ok(!deniedRead.ok && deniedRead.error.code === 'NOT_FOUND');
  assert.ok(!deniedWrite.ok && deniedWrite.error.code === 'NOT_FOUND');
  console.log('PASS: live PostgREST account/save/read, version history, stale edits, original receipt replay, changed-payload rejection and cross-account denial.');

  const duplicate = createInput();
  const duplicates = await Promise.all(Array.from({ length: 4 }, () => ops.execute('save_project', 'fixture-a', duplicate)));
  const first = SaveProjectOutput.parse(duplicates[0]);
  assert.ok(first.ok);
  for (const response of duplicates) assert.deepEqual(response, first);
  const competing = { ...duplicate, project_id: first.data.project.id, expected_version: 1 };
  const edits = await Promise.all(['Edit one', 'Edit two'].map((name) => ops.execute('save_project', 'fixture-a', {
    ...competing, request_id: crypto.randomUUID(), name,
  })));
  assert.equal(edits.filter((result) => result.ok).length, 1);
  assert.equal(edits.filter((result) => !result.ok && result.error.code === 'VERSION_CONFLICT').length, 1);
  console.log('PASS: four simultaneous HTTP saves produce one result; competing versioned edits yield one winner and one conflict.');

  for (const path of ['/rest/v1/projects?select=id', '/rest/v1/rpc/kettle_get_project']) {
    const response = await fetch(`${base}${path}`, {
      method: path.includes('/rpc/') ? 'POST' : 'GET',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      ...(path.includes('/rpc/') ? { body: JSON.stringify({ p_account_id: a, p_input: { project_id: id } }) } : {}),
      signal: AbortSignal.timeout(10_000),
    });
    assert.ok([401, 403].includes(response.status), `Anonymous access must fail; got ${response.status}`);
  }
  const privileges = await sql(`select
    has_table_privilege('authenticated', 'public.projects', 'SELECT') as client_select,
    has_function_privilege('authenticated', 'public.kettle_save_project(uuid,jsonb)', 'EXECUTE') as client_rpc,
    has_table_privilege('service_role', 'public.brief_versions', 'UPDATE') as history_update,
    (select count(*)::int from public.write_receipts where account_id='${a}') as receipts,
    (select count(*)::int from public.brief_versions where account_id='${a}') as versions;`);
  assert.deepEqual(privileges, [{ client_select: false, client_rpc: false, history_update: false, receipts: 4, versions: 4 }]);
  console.log('PASS: anonymous HTTP access denied; authenticated-role RPC/table grants denied; service-role history is append-only; exact save/version counts confirmed.');
  console.log(`Live test elapsed: ${Math.round(performance.now() - started)} ms (includes CLI/network overhead; not a latency benchmark).`);
} finally {
  // Generated UUIDs restrict cleanup to these two accounts; never reset the database.
  await sql(`begin;
    delete from public.write_receipts where account_id in ('${a}', '${b}');
    delete from public.brief_versions where account_id in ('${a}', '${b}');
    delete from public.projects where account_id in ('${a}', '${b}');
    delete from public.accounts where id in ('${a}', '${b}');
    commit;`);
  const remaining = await sql(`select count(*)::int as count from public.accounts where id in ('${a}', '${b}');`);
  assert.deepEqual(remaining, [{ count: 0 }]);
  console.log('PASS: temporary accounts and their records removed. Schema remains installed.');
}
