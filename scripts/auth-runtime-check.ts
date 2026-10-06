/** Test-only workerd cryptography proof. Never imported by the deployed Worker. */
import { generateKeyPair, SignJWT } from 'jose';
import { createJwtVerifier, discover, scopes, type AuthConfig } from '../packages/auth/index.ts';
import { handleWebsiteAuth } from '../packages/auth/website.ts';
import { createOperations, failure } from '../packages/application/operations.ts';

export async function runAuthRuntimeCheck(): Promise<{ status: 'passed'; fixture: true }> {
  const config: AuthConfig = { issuer: 'https://fixture-idp.example/', resource: 'https://fixture-kettle.example/mcp',
    clientId: 'fictional-website-client', clientSecret: 'fictional-secret', sessionSecret: 'cd'.repeat(32) };
  const metadata = { issuer: config.issuer, jwks_uri: `${config.issuer}keys`, authorization_endpoint: `${config.issuer}authorize`,
    token_endpoint: `${config.issuer}token`, revocation_endpoint: `${config.issuer}revoke`, code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['client_secret_post'] };
  // Construct real workerd Requests so unsupported fetch options cannot hide behind mocks.
  await discover(config, (async (input, init) => {
    const request = new Request(input, init);
    if (request.redirect !== 'manual') throw new Error('Discovery must not follow redirects');
    return Response.json(metadata);
  }) as typeof fetch);
  let redirectRejected = false;
  try { await discover(config, (async (input, init) => {
    new Request(input, init);
    return new Response(null, { status: 302, headers: { Location: 'https://untrusted.example/' } });
  }) as typeof fetch); } catch { redirectRejected = true; }
  if (!redirectRejected) throw new Error('Discovery redirect accepted');
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ iss: config.issuer, sub: 'fictional-subject', aud: config.resource, azp: config.clientId,
    iat: now, exp: now + 300, scope: scopes.join(' ') }).setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).sign(privateKey);
  const verifier = createJwtVerifier(config, async () => '11111111-1111-4111-8111-111111111111', publicKey, config.clientId);
  if (!await verifier.verify(token) || await verifier.verify(`${token}bad`)) throw new Error('JWT runtime proof failed');
  const operations = createOperations(verifier, { async call() { return failure('NOT_FOUND'); } });
  const fakeFetch = (async (input, init) => {
    const request = new Request(input, init);
    if (request.redirect !== 'manual') throw new Error('Token exchange must not follow redirects');
    return Response.json({ access_token: token, refresh_token: 'fictional-refresh', token_type: 'Bearer' });
  }) as typeof fetch;
  const login = await handleWebsiteAuth(new Request('https://fixture-kettle.example/auth/login'), config, metadata, verifier, operations, fakeFetch);
  if (login.status !== 303) throw new Error('PKCE runtime proof failed');
  const state = new URL(login.headers.get('location')!).searchParams.get('state');
  const callback = await handleWebsiteAuth(new Request(`https://fixture-kettle.example/auth/callback?state=${state}&code=fictional`, {
    headers: { cookie: login.headers.get('set-cookie')!.split(';')[0]! },
  }), config, metadata, verifier, operations, fakeFetch);
  if (callback.status !== 303 || !callback.headers.get('set-cookie')?.includes('__Host-kettle-session=')) throw new Error('JWE runtime proof failed');
  return { status: 'passed', fixture: true };
}
