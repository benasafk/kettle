import { EncryptJWT, jwtDecrypt } from 'jose';
import { z } from 'zod';
import type { createOperations, IdentityVerifier } from '../application/operations.ts';
import { toolContracts } from '../contracts/index.ts';
import { type AuthConfig, type AuthMetadata, readJsonBounded, scopes } from './index.ts';

const SESSION = '__Host-kettle-session';
const TRANSACTION = '__Host-kettle-transaction';
const sessionSchema = z.object({ access: z.string().min(1), refresh: z.string().min(1).optional(), account: z.string().uuid() });
const txSchema = z.object({ state: z.string().length(43), verifier: z.string().length(43) });
const tokensSchema = z.object({ access_token: z.string().min(1).max(16000), refresh_token: z.string().min(1).max(4000).optional(), token_type: z.literal('Bearer') });
const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]!));
const base64 = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const random = () => base64(crypto.getRandomValues(new Uint8Array(32)));
const key = (config: AuthConfig) => Uint8Array.from(config.sessionSecret.match(/../g)!, (byte) => parseInt(byte, 16));
function cookie(name: string, value: string, ttl: number) {
  if (value.length > 3800) throw new Error('Session too large');
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl}`;
}
function readCookie(request: Request, name: string) {
  const values = (request.headers.get('cookie') ?? '').split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${name}=`));
  return values.length === 1 ? values[0]!.slice(name.length + 1) : '';
}
async function seal(config: AuthConfig, value: Record<string, unknown>, purpose: string, ttl: number) {
  return new EncryptJWT(value).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuer(new URL(config.resource).origin).setAudience(purpose).setIssuedAt().setExpirationTime(`${ttl}s`).encrypt(key(config));
}
async function unseal(config: AuthConfig, value: string, purpose: string) {
  if (!value || value.length > 3800) throw new Error('Missing session');
  return (await jwtDecrypt(value, key(config), { issuer: new URL(config.resource).origin, audience: purpose,
    keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'], requiredClaims: ['exp', 'iat'] })).payload;
}
async function equalSecret(a: string, b: string): Promise<boolean> {
  const hmac = await crypto.subtle.importKey('raw', crypto.getRandomValues(new Uint8Array(32)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const expected = await crypto.subtle.sign('HMAC', hmac, new TextEncoder().encode(a));
  return crypto.subtle.verify('HMAC', hmac, expected, new TextEncoder().encode(b));
}
export function sameOriginPost(request: Request, config: AuthConfig) {
  return request.method === 'POST' && request.headers.get('origin') === new URL(config.resource).origin
    && !['cross-site', 'none'].includes(request.headers.get('sec-fetch-site') ?? '');
}
export async function handleWebsiteAuth(request: Request, config: AuthConfig, metadata: AuthMetadata,
  verifier: IdentityVerifier, operations: ReturnType<typeof createOperations>, fetcher: typeof fetch = fetch): Promise<Response> {
  const url = new URL(request.url);
  const origin = new URL(config.resource).origin;
  const headers = new Headers({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' });
  const redirect = (location: string) => { headers.set('Location', location); return new Response(null, { status: 303, headers }); };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
  const exchange = async (body: URLSearchParams) => {
    body.set('client_id', config.clientId);
    body.set('client_secret', config.clientSecret);
    return tokensSchema.parse(await readJsonBounded(await fetcher(metadata.token_endpoint, {
      method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
      signal: AbortSignal.timeout(10_000),
    })));
  };
  try {
    if (url.origin !== origin || url.protocol !== 'https:') return json({ error: 'Invalid website origin' }, 400);
    if (url.pathname === '/auth/login' && request.method === 'GET') {
      const state = random(); const codeVerifier = random();
      const authUrl = new URL(metadata.authorization_endpoint);
      const params = { response_type: 'code', client_id: config.clientId, redirect_uri: `${origin}/auth/callback`,
        scope: `openid offline_access ${scopes.join(' ')}`, resource: config.resource, audience: config.resource,
        state, code_challenge_method: 'S256',
        code_challenge: base64(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier)))) };
      for (const [name, value] of Object.entries(params)) authUrl.searchParams.set(name, value);
      headers.append('Set-Cookie', cookie(TRANSACTION, await seal(config, { state, verifier: codeVerifier }, 'oauth-transaction', 600), 600));
      return redirect(authUrl.href);
    }
    if (url.pathname === '/auth/callback' && request.method === 'GET') {
      headers.append('Set-Cookie', cookie(TRANSACTION, '', 0));
      const tx = txSchema.parse(await unseal(config, readCookie(request, TRANSACTION), 'oauth-transaction'));
      if (!await equalSecret(tx.state, url.searchParams.get('state') ?? '') || url.searchParams.has('error')
        || !url.searchParams.get('code') || url.searchParams.getAll('code').length !== 1 || url.searchParams.getAll('state').length !== 1
        || (metadata.authorization_response_iss_parameter_supported && url.searchParams.get('iss') !== config.issuer)
        || (url.searchParams.has('iss') && url.searchParams.get('iss') !== config.issuer)) throw new Error('Invalid callback');
      const tokens = await exchange(new URLSearchParams({ grant_type: 'authorization_code', code: url.searchParams.get('code')!,
        redirect_uri: `${origin}/auth/callback`, code_verifier: tx.verifier, resource: config.resource }));
      const identity = await verifier.verify(tokens.access_token);
      if (!identity || !identity.scopes.includes('account:read')) throw new Error('Invalid account token');
      headers.append('Set-Cookie', cookie(SESSION, await seal(config, { access: tokens.access_token,
        ...(tokens.refresh_token ? { refresh: tokens.refresh_token } : {}), account: identity.account_id }, 'website-session', 3600), 3600));
      return redirect('/account');
    }
    if (url.pathname === '/auth/logout') {
      if (!sameOriginPost(request, config)) return json({ error: 'Same-origin POST required' }, 403);
      headers.append('Set-Cookie', cookie(SESSION, '', 0));
      headers.append('Set-Cookie', cookie(TRANSACTION, '', 0));
      // Clear the local session even if the provider cannot revoke its refresh token.
      try {
        const session = sessionSchema.parse(await unseal(config, readCookie(request, SESSION), 'website-session'));
        if (session.refresh) {
          const response = await fetcher(metadata.revocation_endpoint, { method: 'POST', redirect: 'error',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: session.refresh, token_type_hint: 'refresh_token', client_id: config.clientId, client_secret: config.clientSecret }),
            signal: AbortSignal.timeout(5000) });
          if (!response.ok) return json({ error: 'Signed out locally; provider revocation unavailable' }, 502);
        }
      } catch { return json({ error: 'Signed out locally; provider revocation unconfirmed' }, 502); }
      return redirect('/');
    }
    if (url.pathname === '/auth/refresh') {
      if (!sameOriginPost(request, config)) return json({ error: 'Same-origin POST required' }, 403);
      const session = sessionSchema.parse(await unseal(config, readCookie(request, SESSION), 'website-session'));
      if (!session.refresh) throw new Error('Reconnect required');
      const tokens = await exchange(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: session.refresh, resource: config.resource }));
      const identity = await verifier.verify(tokens.access_token);
      if (!identity || identity.account_id !== session.account) throw new Error('Refresh identity mismatch');
      headers.append('Set-Cookie', cookie(SESSION, await seal(config, { access: tokens.access_token,
        refresh: tokens.refresh_token ?? session.refresh, account: identity.account_id }, 'website-session', 3600), 3600));
      return redirect('/account');
    }
    const session = sessionSchema.parse(await unseal(config, readCookie(request, SESSION), 'website-session'));
    if (url.pathname === '/account' && request.method === 'GET') {
      const result = await operations.execute('get_account_state', session.access, {});
      if (!result.ok) return json(result, result.error.code === 'UNAUTHENTICATED' ? 401 : 403);
      headers.set('Content-Type', 'text/html; charset=utf-8');
      headers.set('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'");
      return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Kettle account</title><main><h1>Kettle account</h1>
<p>Account ID: ${result.data.account.id}</p><p>State: ${result.data.account.state}</p>
<p>Website sign-in is complete. Connecting ChatGPT is a separate authorization step.</p>
<p>In ChatGPT Plugins, choose Add custom MCP server and enter <code>${escapeHtml(config.resource)}</code> with OAuth or no authentication (mixed mode). Availability depends on workspace permissions. Use the exact callback shown there when configuring the development connection. There is no public listing yet.</p>
<form method="post" action="/auth/refresh"><button>Refresh website session</button></form>
<form method="post" action="/auth/logout"><button>Sign out of website</button></form></main></html>`, { headers });
    }
    if (url.pathname.startsWith('/api/')) {
      if (!sameOriginPost(request, config) || !request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Same-origin JSON POST required' }, 403);
      const name = url.pathname.slice('/api/'.length);
      if (!(name in toolContracts) || !Object.hasOwn(toolContracts, name)) return json({ error: 'Unknown operation' }, 404);
      const input = await readJsonBounded(new Response(request.body), 128 * 1024);
      const result = await operations.execute(name as keyof typeof toolContracts, session.access, input);
      return json(result, result.ok ? 200 : result.error.code === 'UNAUTHENTICATED' ? 401 : result.error.code === 'FORBIDDEN' ? 403 : 400);
    }
    return json({ error: 'Not found' }, 404);
  } catch {
    if (url.pathname === '/auth/refresh') headers.append('Set-Cookie', cookie(SESSION, '', 0));
    return json({ error: 'Sign-in could not be completed. Reconnect your Kettle account.' }, 401);
  }
}
