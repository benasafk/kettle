import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createOperations, failure } from '../packages/application/operations.ts';
import { SaveProjectOutput, GetProjectOutput, GetAccountStateOutput, type toolContracts } from '../packages/contracts/index.ts';
import { accountA, accountB, createInput } from './fixtures.ts';

const db = new PGlite();
before(async () => {
  // Supabase supplies these roles. PGlite is PostgreSQL in WASM, not hosted Supabase.
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role; alter default privileges in schema public grant all on tables to service_role;');
  for (const file of (await readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  }
  await db.exec(await readFile('supabase/seed.sql', 'utf8'));
});
after(async () => { await db.close(); });

async function rpc(operation: keyof typeof toolContracts, accountId: string, input: unknown) {
  return db.transaction(async (tx) => {
    await tx.exec('set local role service_role');
    const result = await tx.query<{ result: unknown }>(`select public.kettle_${operation}($1::uuid, $2::jsonb) as result`, [accountId, JSON.stringify(input)]);
    return result.rows[0]!.result;
  });
}
const ops = createOperations({ async verify(token) {
  // Test-only identity mapping. Not exported to any runtime module.
  return { account_id: token === 'fixture-a' ? accountA : accountB, scopes: ['projects:read', 'projects:write', 'account:read'] };
} }, { call: rpc });

test('migrations and seed apply; account state reports unconfigured billing honestly', async () => {
  const response = GetAccountStateOutput.parse(await ops.execute('get_account_state', 'fixture-a', {}));
  assert.ok(response.ok);
  assert.equal(response.data.account.display_name, 'Fictional Lamp Studio');
  assert.equal(response.data.entitlements.status, 'not_configured');
  const rows = await db.query('select * from public.brief_versions');
  assert.equal(rows.rows.length, 1);
});
test('save, reopen, edit, duplicate and stale edit preserve immutable history', async () => {
  const input = createInput();
  const saved = SaveProjectOutput.parse(await ops.execute('save_project', 'fixture-a', input));
  assert.ok(saved.ok);
  const id = saved.data.project.id;
  const reopened = GetProjectOutput.parse(await ops.execute('get_project', 'fixture-a', { project_id: id }));
  assert.ok(reopened.ok);
  assert.deepEqual(reopened.data.project, saved.data.project);
  const update = { ...input, request_id: crypto.randomUUID(), project_id: id, expected_version: 1, name: 'Renamed lamp' };
  const edited = SaveProjectOutput.parse(await ops.execute('save_project', 'fixture-a', update));
  assert.ok(edited.ok);
  assert.equal(edited.data.project.current_version, 2);
  assert.deepEqual(await ops.execute('save_project', 'fixture-a', input), saved, 'original receipt survives later edits');
  assert.deepEqual(await ops.execute('save_project', 'fixture-a', update), edited);
  assert.deepEqual(await ops.execute('save_project', 'fixture-a', { ...update, request_id: crypto.randomUUID() }), failure('VERSION_CONFLICT'));
  assert.deepEqual(await ops.execute('save_project', 'fixture-a', { ...input, name: 'Changed payload' }), failure('IDEMPOTENCY_CONFLICT'));
  const history = await db.query<{ version: number; name: string }>('select version, name from public.brief_versions where project_id=$1 order by version', [id]);
  assert.deepEqual(history.rows.map((row) => row.name), ['Fictional desk lamp', 'Renamed lamp']);
});
test('another account cannot read or update a guessed project; request IDs are account scoped', async () => {
  const input = createInput();
  const saved = SaveProjectOutput.parse(await ops.execute('save_project', 'fixture-a', input));
  assert.ok(saved.ok);
  assert.deepEqual(await ops.execute('get_project', 'fixture-b', { project_id: saved.data.project.id }), failure('NOT_FOUND'));
  assert.deepEqual(await ops.execute('save_project', 'fixture-b', {
    ...input, project_id: saved.data.project.id, expected_version: 1,
  }), failure('NOT_FOUND'));
  const own = SaveProjectOutput.parse(await ops.execute('save_project', 'fixture-b', input));
  assert.ok(own.ok);
  assert.notEqual(own.data.project.id, saved.data.project.id);
});
test('repeated queued submissions create one logical project', async () => {
  const input = createInput();
  const results = await Promise.all(Array.from({ length: 4 }, () => rpc('save_project', accountA, input)));
  for (const item of results) assert.deepEqual(item, results[0]);
  // PGlite serializes transactions. Real network/process contention remains a Stage 2 check.
  const receipts = await db.query('select * from public.write_receipts where request_id=$1', [input.request_id]);
  assert.equal(receipts.rows.length, 1);
});
test('suspended account cannot mutate or read projects, including receipt replays', async () => {
  const input = createInput();
  await ops.execute('save_project', 'fixture-b', input);
  await db.query("update public.accounts set state='suspended' where id=$1", [accountB]);
  assert.deepEqual(await ops.execute('save_project', 'fixture-b', input), failure('FORBIDDEN'));
  assert.deepEqual(await ops.execute('get_project', 'fixture-b', { project_id: crypto.randomUUID() }), failure('FORBIDDEN'));
  await db.query("update public.accounts set state='active' where id=$1", [accountB]);
});
test('client roles cannot read tables or execute owner-parameter RPCs', async () => {
  for (const role of ['anon', 'authenticated']) {
    for (const sql of ['select * from public.projects', `select public.kettle_get_account_state('${accountA}', '{}')`]) {
      await assert.rejects(db.transaction(async (tx) => { await tx.exec(`set local role ${role}`); await tx.exec(sql); }), /permission denied/);
    }
  }
  const tables = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname in ('accounts', 'projects', 'brief_versions', 'write_receipts')");
  assert.equal(tables.rows.length, 4);
  assert.ok(tables.rows.every((row) => row.relrowsecurity));
});
test('service role cannot rewrite history, and current pointer must reference a real version', async () => {
  await assert.rejects(db.transaction(async (tx) => {
    await tx.exec('set local role service_role');
    await tx.exec("update public.brief_versions set name='erased'");
  }), /permission denied/);
  await assert.rejects(db.transaction(async (tx) => {
    await tx.exec('set local role service_role');
    await tx.exec('update public.projects set current_version=9999');
  }), /foreign key/);
});

test('a failure after the brief insert rolls back the entire save and can be retried', async () => {
  const input = createInput();
  const saved = SaveProjectOutput.parse(await ops.execute('save_project', 'fixture-a', input));
  assert.ok(saved.ok);
  const update = { ...input, request_id: crypto.randomUUID(), project_id: saved.data.project.id, expected_version: 1, name: 'Retry me' };
  await db.exec(`create function public.test_fail_receipt() returns trigger language plpgsql as $$ begin raise exception 'fixture receipt failure'; end; $$;
    create trigger test_fail_receipt before insert on public.write_receipts for each row execute function public.test_fail_receipt();`);
  try {
    assert.deepEqual(await ops.execute('save_project', 'fixture-a', update), failure('UNAVAILABLE'));
    const reopened = GetProjectOutput.parse(await ops.execute('get_project', 'fixture-a', { project_id: saved.data.project.id }));
    assert.ok(reopened.ok);
    assert.deepEqual(reopened.data.project, saved.data.project);
    const history = await db.query('select * from public.brief_versions where project_id=$1', [saved.data.project.id]);
    assert.equal(history.rows.length, 1);
  } finally {
    await db.exec('drop trigger test_fail_receipt on public.write_receipts; drop function public.test_fail_receipt();');
  }
  const retried = SaveProjectOutput.parse(await ops.execute('save_project', 'fixture-a', update));
  assert.ok(retried.ok);
  assert.equal(retried.data.project.current_version, 2);
});

test('RLS still hides rows if client SELECT privilege is accidentally granted', async () => {
  await db.exec('grant select on public.projects to authenticated');
  try {
    const rows = await db.transaction(async (tx) => {
      await tx.exec('set local role authenticated');
      return tx.query('select * from public.projects');
    });
    assert.deepEqual(rows.rows, []);
  } finally { await db.exec('revoke select on public.projects from authenticated'); }
});
