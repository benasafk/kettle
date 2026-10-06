import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { discover, protectedResource, scopes } from '../packages/auth/index.ts';
import { createOperations, failure } from '../packages/application/operations.ts';
import { handleMcp } from '../apps/worker/mcp.ts';
import { accountA, accountB, createInput } from './fixtures.ts';

import { config, metadata, fixtureAuth } from './auth-fixtures.ts';

test('captured kettle.eu.auth0.com public metadata passes the existing discovery boundary', async () => {
  const evidenceFile = new URL('../docs/engineering/evidence/auth0-public-discovery-20261006.json', import.meta.url);
  const evidence = JSON.parse(await readFile(evidenceFile, 'utf8'));
  // Only the public issuer/resource are real. No client credential or live token
  // exchange is involved; normal test runs replay the captured metadata offline.
  const tenantConfig = { ...config, issuer: 'https://kettle.eu.auth0.com/',
    resource: 'https://kettle-stage2-development.g-baltramiejunas.workers.dev/mcp' };
  const discovered = await discover(tenantConfig, (async (url, init) => {
    assert.equal(String(url), evidence.source);
    assert.equal(init?.redirect, 'error');
    return Response.json(evidence.metadata);
  }) as typeof fetch);
  assert.equal(discovered.issuer, tenantConfig.issuer);
  assert.equal(discovered.authorization_response_iss_parameter_supported, true);
  assert.ok(discovered.code_challenge_methods_supported.includes('S256'));
  assert.ok(discovered.token_endpoint_auth_methods_supported.includes('client_secret_post'));
});

test('signed tokens validate issuer, resource, lifetime, algorithm, scopes before identity mapping', async () => {
  const auth = await fixtureAuth();
  const valid = await auth.token();
  assert.deepEqual(await auth.verifier.verify(valid), { account_id: accountA, scopes: [...scopes] });
  assert.equal(auth.resolutions.length, 1);
  const now = Math.floor(Date.now() / 1000);
  for (const claims of [
    { iss: 'https://evil.example/' }, { aud: 'authenticated' }, { aud: config.clientId },
    { exp: now - 1 }, { nbf: now + 100 }, { iat: now + 1 }, { iat: undefined }, { exp: undefined },
    { gty: 'client-credentials' }, { sub: 'machine@clients' }, { token_use: 'id' },
    { exp: now + 3601 }, { sub: '' }, { scope: 'openid email' }, { scope: undefined },
  ]) assert.equal(await auth.verifier.verify(await auth.token(claims)), null, JSON.stringify(claims));
  assert.equal(await auth.verifier.verify(`${valid.slice(0, -12)}AAAAAAAAAAAA`), null);
  assert.equal(await auth.verifier.verify('eyJhbGciOiJub25lIn0.e30.'), null);
  assert.equal(auth.resolutions.length, 1, 'invalid credentials must never provision accounts');
  auth.block();
  assert.equal(await auth.verifier.verify(valid), null, 'local revocation rechecked on each call');
});
test('same issuer-subject maps to same account across distinct website and MCP clients; email cannot link users', async () => {
  const auth = await fixtureAuth();
  const website = await auth.verifier.verify(await auth.token({ azp: config.clientId, email: 'same@example.test' }));
  const mcp = await auth.verifier.verify(await auth.token({ azp: 'chatgpt-client', email: 'changed@example.test' }));
  const other = await auth.verifier.verify(await auth.token({ sub: 'user-b', email: 'same@example.test' }));
  assert.equal(website?.account_id, mcp?.account_id);
  assert.notEqual(website?.account_id, other?.account_id);
});
test('discovery rejects issuer mismatch, foreign endpoints, missing PKCE and redirects cannot be followed', async () => {
  for (const override of [ { issuer: 'https://evil.example/' }, { token_endpoint: 'https://evil.example/token' },
    { jwks_uri: 'http://identity.example/keys' }, { code_challenge_methods_supported: ['plain'] } ]) {
    await assert.rejects(discover(config, (async (_url, init) => {
      assert.equal(init?.redirect, 'error'); return Response.json({ ...metadata, ...override });
    }) as typeof fetch));
  }
  assert.deepEqual(await discover(config, (async () => Response.json(metadata)) as typeof fetch), metadata);
  assert.equal(protectedResource(config).resource, config.resource);
});
test('authenticated MCP lists scoped tools and returns OAuth challenges; injected ownership never reaches repository', async () => {
  const auth = await fixtureAuth();
  let writes = 0;
  const operations = createOperations(auth.verifier, { async call(_name, owner) {
    writes++; assert.equal(owner, accountA); return failure('NOT_FOUND');
  } });
  const rpc = async (method: string, params: unknown, token?: string) => {
    const response = await handleMcp(new Request(config.resource, { method: 'POST', headers: {
      'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }), { config, verifier: auth.verifier, operations });
    return response;
  };
  const listing = await (await rpc('tools/list', {})).json() as { result: { tools: { name: string; _meta: unknown; securitySchemes: unknown }[] } };
  assert.deepEqual(listing.result.tools.map((tool) => tool.name), ['kettle_diagnostic', 'get_account_state', 'get_project', 'save_project']);
  assert.deepEqual(listing.result.tools[3]?.securitySchemes, [{ type: 'oauth2', scopes: ['projects:write'] }]);
  assert.deepEqual(listing.result.tools[3]?._meta, { securitySchemes: [{ type: 'oauth2', scopes: ['projects:write'] }] });
  const denied = await (await rpc('tools/call', { name: 'save_project', arguments: createInput() })).json() as { result: { isError: boolean; _meta: Record<string, string[]> } };
  assert.equal(denied.result.isError, true);
  assert.match(denied.result._meta['mcp/www_authenticate']![0]!, /resource_metadata=.*invalid_token/);
  const invalidHttp = await rpc('tools/list', {}, 'bad-token');
  assert.equal(invalidHttp.status, 401);
  assert.match(invalidHttp.headers.get('www-authenticate')!, /invalid_token/);
  const missingScope = await (await rpc('tools/call', { name: 'save_project', arguments: createInput() }, await auth.token({ scope: 'account:read' }))).json() as { result: { _meta: Record<string, string[]> } };
  assert.match(missingScope.result._meta['mcp/www_authenticate']![0]!, /insufficient_scope/);
  await rpc('tools/call', { name: 'save_project', arguments: { ...createInput(), account_id: accountB } }, await auth.token());
  assert.equal(writes, 0);
  await rpc('tools/call', { name: 'save_project', arguments: createInput() }, await auth.token());
  assert.equal(writes, 1);
});

test('website verifier rejects a token issued to a different OAuth client', async () => {
  const auth = await fixtureAuth(config.clientId);
  assert.equal(await auth.verifier.verify(await auth.token({ azp: 'chatgpt-client' })), null);
  assert.equal(await auth.verifier.verify(await auth.token({ azp: undefined })), null);
  assert.equal(auth.resolutions.length, 0);
  assert.equal((await auth.verifier.verify(await auth.token()))?.account_id, accountA);
});
