/** Isolated local Supabase integration. Never accepts a remote URL or linked target.
 * Keys are obtained in memory; only generated fictional data is cleaned up. */
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { createSupabaseRepository } from '../packages/database/supabase.ts';
import { SaveProjectOutput, GetProjectOutput } from '../packages/contracts/index.ts';
import { createInput } from '../tests/fixtures.ts';

const run = promisify(execFile);
const root = await realpath(process.cwd());
const expectedId = `kettle-${createHash('sha256').update(root).digest('hex').slice(0, 12)}`;
const ws = JSON.parse(await readFile('.context/workspace.json', 'utf8'));
assert.equal(ws.root, root);
assert.equal(ws.id, expectedId);
const config = await readFile('.context/local-supabase/supabase/config.toml', 'utf8');
assert.ok(config.includes(`project_id = "${expectedId}"`));
let status: Record<string, string>;
try {
  status = JSON.parse((await run('node_modules/.bin/supabase', ['status', '--workdir', '.context/local-supabase', '-o', 'json'], { timeout: 20_000 })).stdout);
} catch { throw new Error('Workspace local Supabase is unavailable; run npm run db:start. CLI output suppressed.'); }
assert.equal(status.API_URL, `http://127.0.0.1:${ws.api_port}`);
assert.ok(status.SERVICE_ROLE_KEY && status.ANON_KEY);
const base = status.API_URL!;
const repo = createSupabaseRepository(base, status.SERVICE_ROLE_KEY!);
const a = crypto.randomUUID();
const b = crypto.randomUUID();
const marker = crypto.randomUUID().replaceAll('-', '');
const trigger = `smoke_receipt_${marker}`;
const issuer = `https://${marker}.example.com/`;
const createdIdentityAccounts: string[] = [];
const started = performance.now();
async function sql(query: string) {
  try {
    return (await run('docker', ['exec', `supabase_db_${expectedId}`, 'psql', '-U', 'postgres', '-d', 'postgres', '--no-psqlrc', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], { timeout: 20_000 })).stdout.trim();
  } catch { throw new Error('Local SQL assertion/setup failed; output suppressed.'); }
}
async function rpc(name: string, input: unknown, key = status.SERVICE_ROLE_KEY!) {
  return fetch(`${base}/rest/v1/rpc/${name}`, { method: 'POST', headers: {
    apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
  }, body: JSON.stringify(input), signal: AbortSignal.timeout(10_000) });
}
// New OS process has no shared application state; secrets travel over stdin only.
async function readInFreshProcess(account: string, project: string) {
  const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import {createSupabaseRepository} from './packages/database/supabase.ts';
    let input=''; for await (const c of process.stdin) input+=c;
    const {base,key,account,project}=JSON.parse(input);
    const r=await createSupabaseRepository(base,key).call('get_project',account,{project_id:project});
    process.stdout.write(JSON.stringify(r));
  `], { stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stdin.end(JSON.stringify({ base, key: status.SERVICE_ROLE_KEY, account, project }));
  const timer = setTimeout(() => child.kill(), 20_000);
  try {
    await new Promise<void>((resolve, reject) => {
      child.on('error', () => reject(new Error('Restart reader failed')));
      child.on('exit', code => code === 0 ? resolve() : reject(new Error('Restart reader failed')));
    });
    return JSON.parse(output);
  } finally { clearTimeout(timer); }
}
try {
  const applied = await sql('select version from supabase_migrations.schema_migrations order by version');
  assert.ok(applied.includes('20261006140000') && applied.includes('20261006150000'));
  await sql(`insert into public.accounts(id,display_name) values ('${a}','Local smoke A'),('${b}','Local smoke B')`);
  const input = createInput();
  const saved = SaveProjectOutput.parse(await repo.call('save_project', a, input));
  assert.ok(saved.ok);
  const id = saved.data.project.id;
  const reopened = GetProjectOutput.parse(await readInFreshProcess(a, id));
  assert.ok(reopened.ok);
  assert.deepEqual(reopened.data.project, saved.data.project);
  const update = { ...input, request_id: crypto.randomUUID(), project_id: id, expected_version: 1, name: 'Local smoke v2' };
  const updated = SaveProjectOutput.parse(await repo.call('save_project', a, update));
  assert.ok(updated.ok);
  const stale = SaveProjectOutput.parse(await repo.call('save_project', a, { ...update, request_id: crypto.randomUUID() }));
  assert.ok(!stale.ok && stale.error.code === 'VERSION_CONFLICT');
  assert.deepEqual(await repo.call('save_project', a, input), saved);
  const changed = SaveProjectOutput.parse(await repo.call('save_project', a, { ...input, name: 'Changed' }));
  assert.ok(!changed.ok && changed.error.code === 'IDEMPOTENCY_CONFLICT');
  for (const operation of ['get_project', 'save_project'] as const) {
    const result = await repo.call(operation, b, operation === 'get_project' ? { project_id: id } : update) as { ok: boolean; error: { code: string } };
    assert.ok(!result.ok && result.error.code === 'NOT_FOUND');
  }
  console.log('PASS: real local PostgREST save/read after a fresh application process; versioning, receipt replay, stale/payload conflicts and account isolation.');

  const duplicate = createInput();
  const results = await Promise.all(Array.from({ length: 4 }, () => repo.call('save_project', a, duplicate)));
  results.forEach(result => assert.deepEqual(result, results[0]));
  const first = SaveProjectOutput.parse(results[0]); assert.ok(first.ok);
  const competing = await Promise.all(['One', 'Two'].map(name => repo.call('save_project', a, {
    ...duplicate, project_id: first.data.project.id, expected_version: 1, request_id: crypto.randomUUID(), name,
  }).then(value => SaveProjectOutput.parse(value))));
  assert.equal(competing.filter(result => result.ok).length, 1);
  assert.equal(competing.filter(result => !result.ok && result.error.code === 'VERSION_CONFLICT').length, 1);
  assert.equal(await sql(`select count(*) from public.write_receipts where account_id='${a}'`), '4');

  const failedInput = { ...update, expected_version: 2, request_id: crypto.randomUUID() };
  await sql(`create function public.${trigger}() returns trigger language plpgsql as $$ begin
    if new.account_id='${a}'::uuid and new.request_id='${failedInput.request_id}'::uuid then raise exception 'local test failure'; end if;
    return new; end; $$;
    create trigger ${trigger} before insert on public.write_receipts for each row execute function public.${trigger}();`);
  await assert.rejects(repo.call('save_project', a, failedInput));
  const afterFailure = GetProjectOutput.parse(await repo.call('get_project', a, { project_id: id })); assert.ok(afterFailure.ok);
  assert.deepEqual(afterFailure.data.project, updated.data.project);
  assert.equal(await sql(`select count(*) from public.brief_versions where project_id='${id}'`), '2');
  assert.equal(await sql(`select count(*) from public.write_receipts where account_id='${a}' and request_id='${failedInput.request_id}'`), '0');
  await sql(`drop trigger ${trigger} on public.write_receipts; drop function public.${trigger}()`);
  const retry = SaveProjectOutput.parse(await repo.call('save_project', a, failedInput)); assert.ok(retry.ok);
  assert.equal(retry.data.project.current_version, 3);
  console.log('PASS: concurrent duplicate writes and competing edits; injected receipt failure rolls back the HTTP transaction; identical retry succeeds.');

  const issued = Math.floor(Date.now() / 1000) - 5;
  const identityInput = { p_issuer: issuer, p_subject: 'fictional-subject', p_issued_at: issued };
  const identities = await Promise.all(Array.from({ length: 4 }, async () => {
    const response = await rpc('kettle_resolve_identity', identityInput); assert.equal(response.status, 200);
    const id: unknown = await response.json();
    assert.ok(typeof id === 'string');
    return id;
  }));
  identities.forEach(id => { assert.match(id, /^[0-9a-f-]{36}$/); assert.equal(id, identities[0]); });
  createdIdentityAccounts.push(identities[0]!);
  assert.equal(await sql(`select count(*) from public.account_identities where issuer='${issuer}'`), '1');
  await sql(`update public.account_identities set tokens_valid_after=to_timestamp(${issued}) where issuer='${issuer}'`);
  assert.equal(await (await rpc('kettle_resolve_identity', identityInput)).json(), null);
  assert.equal(await (await rpc('kettle_resolve_identity', { ...identityInput, p_issued_at: issued + 1 })).json(), identities[0]);
  await sql(`update public.account_identities set blocked=true where issuer='${issuer}'`);
  assert.equal(await (await rpc('kettle_resolve_identity', { ...identityInput, p_issued_at: issued + 1 })).json(), null);
  const anon = await rpc('kettle_resolve_identity', identityInput, status.ANON_KEY!);
  assert.ok([401, 403].includes(anon.status));
  assert.equal(await sql("select has_function_privilege('authenticated','public.kettle_resolve_identity(text,text,numeric)','EXECUTE')"), 'f');
  console.log('PASS: concurrent first-login mapping provisions one account; cutoff/block deny access; client roles cannot resolve identities. OAuth itself is not tested here.');
  console.log(`Local integration elapsed: ${Math.round(performance.now() - started)} ms (includes process/SQL overhead).`);
} finally {
  // Also discover mapping accounts if an assertion failed before the list was filled.
  const mapped = await sql(`select account_id from public.account_identities where issuer='${issuer}'`);
  const ids = [...new Set([a, b, ...createdIdentityAccounts, ...mapped.split('\n').filter(Boolean)])];
  ids.forEach(id => assert.match(id, /^[0-9a-f-]{36}$/));
  const values = ids.map(id => `'${id}'`).join(',');
  await sql(`begin;
    drop trigger if exists ${trigger} on public.write_receipts; drop function if exists public.${trigger}();
    delete from public.account_identities where issuer='${issuer}';
    delete from public.write_receipts where account_id in (${values});
    delete from public.brief_versions where account_id in (${values});
    delete from public.projects where account_id in (${values});
    delete from public.accounts where id in (${values}); commit;`);
  assert.equal(await sql(`select count(*) from public.accounts where id in (${values})`), '0');
  console.log('PASS: generated local smoke records and failure trigger removed; existing data and migration history preserved.');
}
