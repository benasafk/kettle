import assert from 'node:assert/strict';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createJwtVerifier, scopes, type AuthConfig } from '../packages/auth/index.ts';
import { accountA, accountB } from './fixtures.ts';
export const config: AuthConfig = { issuer: 'https://identity.example/', resource: 'https://kettle.example/mcp',
  clientId: 'website-client', clientSecret: 'fixture-client-secret', sessionSecret: 'ab'.repeat(32) };
export const metadata = { issuer: config.issuer, jwks_uri: `${config.issuer}.well-known/jwks.json`,
  authorization_endpoint: `${config.issuer}authorize`, token_endpoint: `${config.issuer}oauth/token`,
  revocation_endpoint: `${config.issuer}oauth/revoke`, code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['client_secret_post'],
  authorization_response_iss_parameter_supported: true };
export async function fixtureAuth(requiredClientId?: string) {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const resolutions: string[] = [];
  let blocked = false;
  const verifier = createJwtVerifier(config, async (issuer, subject) => {
    assert.equal(issuer, config.issuer); resolutions.push(subject);
    return blocked ? null : subject === 'user-a' ? accountA : accountB;
  }, createLocalJWKSet({ keys: [{ ...jwk, kid: 'test-key', alg: 'RS256' }] }), requiredClientId);
  const token = (claims: Record<string, unknown> = {}) => {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ sub: 'user-a', iss: config.issuer, aud: config.resource, iat: now, exp: now + 300,
      azp: config.clientId, scope: scopes.join(' '), ...claims }).setProtectedHeader({ alg: 'RS256', kid: 'test-key', typ: 'JWT' }).sign(privateKey);
  };
  return { verifier, token, resolutions, block: () => { blocked = true; } };
}
