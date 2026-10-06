import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jwtDecrypt } from 'jose';
import { createOperations, failure } from '../packages/application/operations.ts';
import { handleWebsiteAuth, websiteAuthUnavailable } from '../packages/auth/website.ts';
import { config, metadata, fixtureAuth } from './auth-fixtures.ts';
import { accountA, accountB, createInput } from './fixtures.ts';

function cookieHeader(response: Response) {
  return response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
}
test('discovery outage still permits same-origin local logout, without claiming remote revocation', async () => {
  const response = websiteAuthUnavailable(new Request('https://kettle.example/auth/logout', {
    method: 'POST', headers: { Origin: 'https://kettle.example' },
  }), config);
  assert.equal(response.status, 502);
  assert.equal(response.headers.getSetCookie().length, 2);
  for (const value of response.headers.getSetCookie()) assert.match(value, /HttpOnly; Secure; SameSite=Lax; Max-Age=0/);
  assert.match(await response.text(), /revocation unconfirmed/);
  for (const init of [{ method: 'GET' }, { method: 'POST', headers: { Origin: 'https://evil.example' } }]) {
    const denied = websiteAuthUnavailable(new Request('https://kettle.example/auth/logout', init), config);
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('set-cookie'), null);
  }
  const unavailable = websiteAuthUnavailable(new Request('https://kettle.example/account'), config);
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('set-cookie'), null);
});
async function flow() {
  const auth = await fixtureAuth(config.clientId);
  const access = await auth.token();
  let exchanges = 0; let revoked = 0; let repositoryCalls = 0;
  let tokenStatus = 200; let revocationStatus = 200;
  const revokedTokens: string[] = [];
  let tokenResponse = { access_token: access, refresh_token: 'fictional-refresh', token_type: 'Bearer' };
  const operations = createOperations(auth.verifier, { async call(name, account, input) {
    repositoryCalls++;
    if (name === 'get_account_state') return { ok: true, data: { account: { id: account, display_name: 'Test member', state: 'active', preferred_language: 'en', created_at: new Date().toISOString() }, entitlements: { status: 'not_configured' }, usage: { status: 'not_configured', reset_at: null } } };
    if (name === 'save_project') {
      const saved = input as ReturnType<typeof createInput>;
      const id = crypto.randomUUID(); const at = new Date().toISOString();
      return { ok: true, data: { request_id: saved.request_id, project: { id, name: saved.name, project_type: saved.project_type, current_version: 1, created_at: at, updated_at: at,
        brief_version: { id: crypto.randomUUID(), project_id: id, version: 1, name: saved.name, brief: saved.brief, created_at: at } } } };
    }
    return failure('NOT_FOUND');
  } });
  const fetcher = (async (url, init) => {
    assert.equal(init?.redirect, 'manual');
    if (String(url) === metadata.revocation_endpoint) {
      const form = new URLSearchParams(String(init?.body));
      assert.equal(form.get('client_id'), config.clientId);
      assert.equal(form.get('client_secret'), config.clientSecret);
      assert.equal(form.get('token_type_hint'), 'refresh_token');
      revokedTokens.push(form.get('token')!);
      revoked++; return new Response(null, { status: revocationStatus });
    }
    assert.equal(String(url), metadata.token_endpoint); exchanges++;
    const form = new URLSearchParams(String(init?.body));
    assert.equal(form.get('client_secret'), config.clientSecret);
    if (form.get('grant_type') === 'authorization_code') {
      assert.equal(form.get('redirect_uri'), 'https://kettle.example/auth/callback');
      assert.equal(form.get('code_verifier')?.length, 43);
    }
    return tokenStatus === 200 ? Response.json(tokenResponse) : Response.json({ error: 'invalid_grant' }, { status: tokenStatus });
  }) as typeof fetch;
  const call = (path: string, init: RequestInit = {}) => handleWebsiteAuth(new Request(`https://kettle.example${path}`, init), config, metadata, auth.verifier, operations, fetcher);
  const login = await call('/auth/login');
  const authorization = new URL(login.headers.get('location')!);
  const callback = `/auth/callback?state=${authorization.searchParams.get('state')}&code=fictional-code&iss=${encodeURIComponent(config.issuer)}`;
  return { auth, call, login, authorization, callback, counts: () => ({ exchanges, revoked, repositoryCalls }),
    revokedTokens,
    failTokenExchange: (status: number) => { tokenStatus = status; },
    failRevocation: (status: number) => { revocationStatus = status; },
    setTokens: (tokens: typeof tokenResponse) => { tokenResponse = tokens; } };
}
test('website PKCE callback requires cookie-bound state and issuer, seals credentials in Secure HttpOnly cookie', async () => {
  const f = await flow();
  assert.equal(f.authorization.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(f.authorization.searchParams.get('resource'), config.resource);
  assert.match(f.login.headers.get('set-cookie')!, /HttpOnly; Secure; SameSite=Lax/);
  const callbackNoCookie = await f.call(f.callback);
  assert.equal(callbackNoCookie.status, 401);
  const headers = { cookie: cookieHeader(f.login) };
  assert.equal((await f.call(f.callback.replace('state=', 'state=wrong'), { headers })).status, 401);
  assert.equal((await f.call(f.callback.replace(encodeURIComponent(config.issuer), 'https%3A%2F%2Fevil.example%2F'), { headers })).status, 401);
  assert.equal((await f.call(f.callback.split('&iss=')[0]!, { headers })).status, 401, 'advertised issuer identification requires iss');
  for (const duplicate of ['iss=https%3A%2F%2Fevil.example%2F', `iss=${encodeURIComponent(config.issuer)}`, 'code=second-code', 'state=second-state']) {
    assert.equal((await f.call(`${f.callback}&${duplicate}`, { headers })).status, 401);
  }
  assert.equal(f.counts().exchanges, 0);
  const signedIn = await f.call(f.callback, { headers });
  assert.equal(signedIn.status, 303);
  assert.equal(signedIn.headers.get('location'), '/account');
  assert.equal(f.counts().exchanges, 1);
  const sealed = signedIn.headers.getSetCookie().find((value) => value.startsWith('__Host-kettle-session='))!.split(';')[0]!.split('=')[1]!;
  assert.ok(!sealed.includes('fictional-refresh'));
  const { payload } = await jwtDecrypt(sealed, Uint8Array.from(config.sessionSecret.match(/../g)!, (byte) => parseInt(byte, 16)));
  assert.equal(payload.account, accountA);
  assert.equal(payload.refresh, 'fictional-refresh');
});
test('website declines authorization without token exchange; cookie tampering and cross-origin writes fail', async () => {
  const f = await flow();
  const headers = { cookie: cookieHeader(f.login) };
  assert.equal((await f.call(`${f.callback}&error=access_denied`, { headers })).status, 401);
  assert.equal(f.counts().exchanges, 0);
  const session = await f.call(f.callback, { headers });
  const cookies = cookieHeader(session);
  for (const path of ['/auth/refresh', '/auth/logout', '/api/save_project']) {
    assert.equal((await f.call(path, { method: 'POST', headers: { cookie: cookies, Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  }
  assert.equal((await f.call('/account', { headers: { cookie: cookies.replace('__Host-kettle-session=', '__Host-kettle-session=X') } })).status, 401);
  assert.equal(f.counts().exchanges, 1);
});
test('refresh rotates cookies, rejects changed identity, and logout revokes refresh token without exposing credentials', async () => {
  const f = await flow();
  const session = await f.call(f.callback, { headers: { cookie: cookieHeader(f.login) } });
  const headers = { cookie: cookieHeader(session), Origin: 'https://kettle.example' };
  f.setTokens({ access_token: await f.auth.token(), refresh_token: 'rotated-refresh', token_type: 'Bearer' });
  const refreshed = await f.call('/auth/refresh', { method: 'POST', headers });
  assert.equal(refreshed.status, 303);
  assert.match(refreshed.headers.get('set-cookie')!, /__Host-kettle-session=/);
  f.setTokens({ access_token: await f.auth.token({ sub: 'user-b' }), refresh_token: 'wrong-account', token_type: 'Bearer' });
  const switched = await f.call('/auth/refresh', { method: 'POST', headers });
  assert.equal(switched.status, 401);
  assert.match(switched.headers.get('set-cookie')!, /Max-Age=0/);
  const logout = await f.call('/auth/logout', { method: 'POST', headers });
  assert.equal(logout.status, 303);
  assert.equal(f.counts().revoked, 1);
  assert.match(logout.headers.get('set-cookie')!, /Max-Age=0/);
  assert.ok(!(await logout.text()).includes(config.clientSecret));
  assert.notEqual(accountA, accountB);
});

test('website account and JSON API use the verified account; ownership injection, scope loss and local revocation fail closed', async () => {
  const f = await flow();
  const signedIn = await f.call(f.callback, { headers: { cookie: cookieHeader(f.login) } });
  const cookies = cookieHeader(signedIn);
  const account = await f.call('/account', { headers: { cookie: cookies } });
  assert.equal(account.status, 200);
  const html = await account.text();
  assert.match(html, new RegExp(accountA));
  assert.ok(html.includes(config.resource));
  const headers = { cookie: cookies, Origin: 'https://kettle.example', 'Content-Type': 'application/json' };
  const saved = await f.call('/api/save_project', { method: 'POST', headers, body: JSON.stringify(createInput()) });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json() as { ok: boolean }).ok, true);
  const count = f.counts().repositoryCalls;
  const injected = await f.call('/api/save_project', { method: 'POST', headers, body: JSON.stringify({ ...createInput(), account_id: accountB }) });
  assert.equal(injected.status, 400);
  assert.equal(f.counts().repositoryCalls, count);
  f.setTokens({ access_token: await f.auth.token({ scope: 'account:read' }), refresh_token: 'read-only', token_type: 'Bearer' });
  const refreshed = await f.call('/auth/refresh', { method: 'POST', headers });
  assert.equal(refreshed.status, 303);
  const limited = await f.call('/api/save_project', { method: 'POST', headers: { ...headers, cookie: cookieHeader(refreshed) }, body: JSON.stringify(createInput()) });
  assert.equal(limited.status, 403);
  assert.equal(f.counts().repositoryCalls, count);
  f.auth.block();
  assert.equal((await f.call('/account', { headers: { cookie: cookies } })).status, 401);
  assert.equal(f.counts().repositoryCalls, count);
});

test('rejected refresh clears the session without retry and reconnects to the same account', async () => {
  const f = await flow();
  const signedIn = await f.call(f.callback, { headers: { cookie: cookieHeader(f.login) } });
  f.failTokenExchange(400);
  const rejected = await f.call('/auth/refresh', { method: 'POST', headers: {
    cookie: cookieHeader(signedIn), Origin: 'https://kettle.example',
  } });
  assert.equal(rejected.status, 401);
  assert.match(rejected.headers.get('set-cookie')!, /__Host-kettle-session=;.*Max-Age=0/);
  assert.equal(f.counts().exchanges, 2, 'one login and one refresh; no automatic replay');
  assert.equal(f.counts().repositoryCalls, 0);
  const login = await f.call('/auth/login');
  const state = new URL(login.headers.get('location')!).searchParams.get('state');
  f.failTokenExchange(200);
  const reconnect = await f.call(`/auth/callback?state=${state}&code=new-code&iss=${encodeURIComponent(config.issuer)}`, {
    headers: { cookie: cookieHeader(login) },
  });
  assert.equal(reconnect.status, 303);
  const account = await f.call('/account', { headers: { cookie: cookieHeader(reconnect) } });
  assert.equal(account.status, 200);
  assert.match(await account.text(), new RegExp(accountA));
});

test('provider revocation failure clears local cookies but a copied session persists until local block or expiry', async () => {
  const f = await flow();
  const signedIn = await f.call(f.callback, { headers: { cookie: cookieHeader(f.login) } });
  const copied = cookieHeader(signedIn);
  f.failRevocation(503);
  const logout = await f.call('/auth/logout', { method: 'POST', headers: { cookie: copied, Origin: 'https://kettle.example' } });
  assert.equal(logout.status, 502);
  assert.match(await logout.text(), /provider revocation unavailable/);
  for (const value of logout.headers.getSetCookie()) assert.match(value, /Max-Age=0/);
  assert.equal(f.counts().revoked, 1);
  assert.equal((await f.call('/account', { headers: { cookie: copied } })).status, 200);
  f.auth.block();
  assert.equal((await f.call('/account', { headers: { cookie: copied } })).status, 401);
});

test('logout submits the latest rotated refresh token; a successful fixture revoke is not access-token invalidation', async () => {
  const f = await flow();
  const signedIn = await f.call(f.callback, { headers: { cookie: cookieHeader(f.login) } });
  f.setTokens({ access_token: await f.auth.token(), refresh_token: 'latest-rotated-fixture', token_type: 'Bearer' });
  const refreshed = await f.call('/auth/refresh', { method: 'POST', headers: {
    cookie: cookieHeader(signedIn), Origin: 'https://kettle.example',
  } });
  assert.equal(refreshed.status, 303);
  const latestCookie = cookieHeader(refreshed);
  const logout = await f.call('/auth/logout', { method: 'POST', headers: {
    cookie: latestCookie, Origin: 'https://kettle.example',
  } });
  assert.equal(logout.status, 303);
  assert.deepEqual(f.revokedTokens, ['latest-rotated-fixture']);
  assert.equal(f.counts().revoked, 1);
  // The provider is mocked: this proves the application has no immediate
  // access-token invalidation hook, not that Auth0 revoked a real grant.
  assert.equal((await f.call('/account', { headers: { cookie: latestCookie } })).status, 200);
  f.auth.block();
  assert.equal((await f.call('/account', { headers: { cookie: latestCookie } })).status, 401);
});
