import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createJwtVerifier, scopes } from '../packages/auth/index.ts';
import { handleWebsiteAuth } from '../packages/auth/website.ts';
import { createOperations, type ProjectRepository } from '../packages/application/operations.ts';
import { GetAccountStateOutput, GetProjectOutput, SaveProjectOutput } from '../packages/contracts/index.ts';
import { OpenAIProfile } from '../packages/contracts/openai-profile.ts';
import { handleMcp } from '../apps/worker/mcp.ts';
import { config, metadata } from './auth-fixtures.ts';
import { createInput } from './fixtures.ts';

// Local signed credentials + real migration SQL. No Auth0, network PostgREST,
// ChatGPT conversation, or multi-connection concurrency proof is implied.
test('signed website and separate MCP credentials share SQL ownership across reconnect and deny a second account', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role; alter default privileges in schema public grant all on tables to service_role;');
  for (const file of (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  }
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const keys = createLocalJWKSet({ keys: [{ ...await exportJWK(publicKey), kid: 'persistence-test', alg: 'RS256' }] });
  const issued = Math.floor(Date.now() / 1000) - 10;
  const token = (subject: string, client: string, claims: Record<string, unknown> = {}) => new SignJWT({
    sub: subject, iss: config.issuer, aud: config.resource, azp: client,
    iat: issued, exp: issued + 300, scope: scopes.join(' '), ...claims,
  }).setProtectedHeader({ alg: 'RS256', kid: 'persistence-test', typ: 'JWT' }).sign(privateKey);
  const resolve = (issuer: string, subject: string, iat: number) => db.transaction(async (tx) => {
    await tx.exec('set local role service_role');
    return (await tx.query<{ id: string | null }>('select public.kettle_resolve_identity($1,$2,$3) as id', [issuer, subject, iat])).rows[0]!.id;
  });
  let storageCalls = 0;
  const repository: ProjectRepository = { call: (operation, owner, input) => db.transaction(async (tx) => {
    storageCalls++;
    await tx.exec('set local role service_role');
    return (await tx.query<{ result: unknown }>(`select public.kettle_${operation}($1::uuid,$2::jsonb) as result`, [owner, JSON.stringify(input)])).rows[0]!.result;
  }) };
  const websiteVerifier = createJwtVerifier(config, resolve, keys, config.clientId);
  const websiteOperations = createOperations(websiteVerifier, repository);
  const websiteToken = await token('fictional-a', config.clientId);
  const website = (path: string, init?: RequestInit) => handleWebsiteAuth(
    new Request(`https://kettle.example${path}`, init), config, metadata, websiteVerifier, websiteOperations,
    (async () => Response.json({ access_token: websiteToken, token_type: 'Bearer' })) as typeof fetch,
  );
  const cookies = (response: Response) => response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  const login = await website('/auth/login');
  const state = new URL(login.headers.get('location')!).searchParams.get('state');
  const callback = await website(`/auth/callback?state=${state}&code=fixture&iss=${encodeURIComponent(config.issuer)}`, { headers: { cookie: cookies(login) } });
  assert.equal(callback.status, 303);
  const websiteHeaders = { cookie: cookies(callback), Origin: 'https://kettle.example', 'Content-Type': 'application/json' };
  const websiteAccount = GetAccountStateOutput.parse(await (await website('/api/get_account_state', { method: 'POST', headers: websiteHeaders, body: '{}' })).json());
  assert.ok(websiteAccount.ok);

  // Each request builds a new verifier/application/MCP transport. Only SQL persists.
  const mcp = async (credential: string, name: string, args: unknown) => {
    const verifier = createJwtVerifier(config, resolve, keys);
    return handleMcp(new Request(config.resource, { method: 'POST', headers: {
      Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
    }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) }),
    { config, verifier, operations: createOperations(verifier, repository) });
  };
  const content = async (response: Response) => {
    assert.equal(response.status, 200);
    const envelope = await response.json() as { result: { structuredContent: unknown; _meta?: Record<string, string[]> } };
    assert.ok(envelope.result.structuredContent, JSON.stringify(envelope));
    return envelope.result;
  };
  const mcpToken = await token('fictional-a', 'separate-chatgpt-client');
  const mcpAccount = GetAccountStateOutput.parse((await content(await mcp(mcpToken, 'get_account_state', {}))).structuredContent);
  assert.ok(mcpAccount.ok);
  assert.equal(mcpAccount.data.account.id, websiteAccount.data.account.id);
  const profile = OpenAIProfile.parse((await content(await mcp(mcpToken, 'get_riff_profile', {}))).structuredContent);
  assert.deepEqual(profile, { id: websiteAccount.data.account.id, name: websiteAccount.data.account.display_name });
  const input = createInput();
  const saved = SaveProjectOutput.parse((await content(await mcp(mcpToken, 'save_project', input))).structuredContent);
  assert.ok(saved.ok);
  const projectId = saved.data.project.id;
  const update = { ...input, request_id: crypto.randomUUID(), project_id: projectId, expected_version: 1,
    brief: { ...input.brief, audience: 'Fictional home-office workers' } };
  const updated = SaveProjectOutput.parse((await content(await mcp(mcpToken, 'save_project', update))).structuredContent);
  assert.ok(updated.ok);
  assert.equal(updated.data.project.current_version, 2);
  const reconnected = await token('fictional-a', 'separate-chatgpt-client', { iat: issued + 1 });
  assert.equal(OpenAIProfile.parse((await content(await mcp(reconnected, 'get_riff_profile', {}))).structuredContent).id, profile.id);
  const reopened = GetProjectOutput.parse((await content(await mcp(reconnected, 'get_project', { project_id: projectId }))).structuredContent);
  assert.ok(reopened.ok);
  assert.deepEqual(reopened.data.project, updated.data.project);
  const websiteRead = GetProjectOutput.parse(await (await website('/api/get_project', { method: 'POST', headers: websiteHeaders, body: JSON.stringify({ project_id: projectId }) })).json());
  assert.ok(websiteRead.ok);
  assert.deepEqual(websiteRead.data.project, updated.data.project);

  const otherToken = await token('fictional-b', 'separate-chatgpt-client');
  const otherAccount = GetAccountStateOutput.parse((await content(await mcp(otherToken, 'get_account_state', {}))).structuredContent);
  assert.ok(otherAccount.ok);
  assert.notEqual(otherAccount.data.account.id, websiteAccount.data.account.id);
  assert.notEqual(OpenAIProfile.parse((await content(await mcp(otherToken, 'get_riff_profile', {}))).structuredContent).id, profile.id);
  const deniedRead = GetProjectOutput.parse((await content(await mcp(otherToken, 'get_project', { project_id: projectId }))).structuredContent);
  const absentRead = GetProjectOutput.parse((await content(await mcp(otherToken, 'get_project', { project_id: crypto.randomUUID() }))).structuredContent);
  assert.ok(!deniedRead.ok && deniedRead.error.code === 'NOT_FOUND');
  assert.deepEqual(deniedRead, absentRead);
  const deniedRequestId = crypto.randomUUID();
  const beforeDeniedWrite = await db.query('select * from public.projects where id=$1', [projectId]);
  const deniedWrite = SaveProjectOutput.parse((await content(await mcp(otherToken, 'save_project', { ...update, request_id: deniedRequestId, expected_version: 2 }))).structuredContent);
  assert.ok(!deniedWrite.ok && deniedWrite.error.code === 'NOT_FOUND');
  assert.deepEqual(await db.query('select * from public.projects where id=$1', [projectId]), beforeDeniedWrite);
  const rejectedReceipts = await db.query('select * from public.write_receipts where account_id=$1 and request_id=$2', [otherAccount.data.account.id, deniedRequestId]);
  assert.equal(rejectedReceipts.rows.length, 0, 'cross-account denial creates no successful receipt');

  const callsBeforeDenial = storageCalls;
  const scopeDenied = await content(await mcp(await token('fictional-a', 'separate-chatgpt-client', { scope: 'account:read' }), 'get_project', { project_id: projectId }));
  assert.match(scopeDenied._meta!['mcp/www_authenticate']![0]!, /insufficient_scope/);
  const limitedWriteId = crypto.randomUUID();
  const limitedWrite = await content(await mcp(await token('fictional-a', 'separate-chatgpt-client', { scope: 'account:read' }), 'save_project', { ...update, request_id: limitedWriteId, expected_version: 2 }));
  const limitedResult = SaveProjectOutput.parse(limitedWrite.structuredContent);
  assert.ok(!limitedResult.ok && limitedResult.error.code === 'FORBIDDEN');
  assert.match(limitedWrite._meta!['mcp/www_authenticate']![0]!, /insufficient_scope/);
  assert.equal((await mcp(await token('fictional-a', 'separate-chatgpt-client', { exp: issued + 1 }), 'get_project', { project_id: projectId })).status, 401);
  assert.equal(storageCalls, callsBeforeDenial);

  await db.query('update public.account_identities set tokens_valid_after=to_timestamp($1) where account_id=$2', [issued, websiteAccount.data.account.id]);
  assert.equal((await mcp(mcpToken, 'get_project', { project_id: projectId })).status, 401);
  assert.equal((await website('/account', { headers: websiteHeaders })).status, 401);
  const afterCutoff = GetProjectOutput.parse((await content(await mcp(reconnected, 'get_project', { project_id: projectId }))).structuredContent);
  assert.ok(afterCutoff.ok);
  await db.query('update public.account_identities set blocked=true where account_id=$1', [websiteAccount.data.account.id]);
  assert.equal((await mcp(reconnected, 'get_project', { project_id: projectId })).status, 401);
  // A freshly issued token cannot evade a block. Unblocking retains the cutoff:
  // old credentials stay rejected and a new credential recovers the same account.
  const newer = await token('fictional-a', 'separate-chatgpt-client', { iat: issued + 2 });
  assert.equal((await mcp(newer, 'get_project', { project_id: projectId })).status, 401);
  const unaffected = GetAccountStateOutput.parse((await content(await mcp(otherToken, 'get_account_state', {}))).structuredContent);
  assert.ok(unaffected.ok);
  assert.equal(unaffected.data.account.id, otherAccount.data.account.id);
  await db.query('update public.account_identities set blocked=false where account_id=$1', [websiteAccount.data.account.id]);
  assert.equal((await mcp(mcpToken, 'get_project', { project_id: projectId })).status, 401, 'unblocking must not undo the cutoff');
  const recoveredAccount = GetAccountStateOutput.parse((await content(await mcp(newer, 'get_account_state', {}))).structuredContent);
  assert.ok(recoveredAccount.ok);
  assert.equal(recoveredAccount.data.account.id, websiteAccount.data.account.id);
  const recoveredProject = GetProjectOutput.parse((await content(await mcp(newer, 'get_project', { project_id: projectId }))).structuredContent);
  assert.ok(recoveredProject.ok);
  assert.deepEqual(recoveredProject.data.project, updated.data.project);
  const count = await db.query<{ count: number }>('select count(*)::int as count from public.account_identities');
  assert.equal(count.rows[0]!.count, 2, 'refresh/reconnect must not provision extra identities');
  const history = await db.query<{ count: number }>('select count(*)::int as count from public.brief_versions where project_id=$1', [projectId]);
  assert.equal(history.rows[0]!.count, 2, 'denied writes must not append history');
});
