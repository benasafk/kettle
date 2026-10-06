import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import type { IdentityVerifier } from '../application/operations.ts';

export const scopes = ['account:read', 'projects:read', 'projects:write'] as const;
export interface AuthConfig {
  issuer: string;
  resource: string;
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
}
export type IdentityResolver = (issuer: string, subject: string, issuedAt: number) => Promise<string | null>;
const metadataSchema = z.object({
  issuer: z.string(), jwks_uri: z.string(), authorization_endpoint: z.string(), token_endpoint: z.string(),
  revocation_endpoint: z.string(), token_endpoint_auth_methods_supported: z.array(z.string()), code_challenge_methods_supported: z.array(z.string()),
  authorization_response_iss_parameter_supported: z.boolean().optional(),
});
export type AuthMetadata = z.infer<typeof metadataSchema>;
export function secureUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) throw new Error('Invalid auth URL');
  return url;
}
export function validateConfig(config: AuthConfig): AuthConfig {
  const issuer = secureUrl(config.issuer);
  const resource = secureUrl(config.resource);
  if (!issuer.pathname.endsWith('/') || resource.pathname !== '/mcp' || !config.clientId || !config.clientSecret
    || !/^[a-f0-9]{64}$/i.test(config.sessionSecret)) throw new Error('Incomplete auth configuration');
  return config;
}
export async function readJsonBounded(response: Response, limit = 32_768): Promise<unknown> {
  if (!response.ok || !response.body) throw new Error('Upstream unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) throw new Error('Response too large');
      chunks.push(chunk.value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function discover(config: AuthConfig, fetcher: typeof fetch = fetch): Promise<AuthMetadata> {
  validateConfig(config);
  const response = await fetcher(new URL('.well-known/openid-configuration', config.issuer), {
    redirect: 'error', signal: AbortSignal.timeout(5000),
  });
  const metadata = metadataSchema.parse(await readJsonBounded(response));
  if (metadata.issuer !== config.issuer || !metadata.code_challenge_methods_supported.includes('S256')
    || !metadata.token_endpoint_auth_methods_supported.includes('client_secret_post')) throw new Error('Unsupported issuer');
  for (const endpoint of [metadata.jwks_uri, metadata.authorization_endpoint, metadata.token_endpoint, metadata.revocation_endpoint]) {
    if (secureUrl(endpoint).origin !== new URL(config.issuer).origin) throw new Error('Foreign auth endpoint');
  }
  return metadata;
}

/** Only trusted server composition can supply a resolver or signing key source. No token-selected URLs. */
export function createJwtVerifier(config: AuthConfig, resolve: IdentityResolver,
  key: Parameters<typeof jwtVerify>[1], requiredClientId?: string): IdentityVerifier {
  validateConfig(config);
  return {
    async verify(token) {
      try {
        if (token.length > 16_384) return null;
        const { payload, protectedHeader } = await jwtVerify(token, key, {
          issuer: config.issuer, audience: config.resource, algorithms: ['RS256'],
          requiredClaims: ['sub', 'iat', 'exp', 'scope'], clockTolerance: 0,
        });
        if (requiredClientId && payload.azp !== requiredClientId) return null;
        if (['client-credentials', 'client_credentials'].includes(String(payload.gty))
          || payload.sub?.endsWith('@clients') || (payload.token_use !== undefined && payload.token_use !== 'access')) return null;
        const now = Math.floor(Date.now() / 1000);
        if (!['JWT', 'at+jwt'].includes(protectedHeader.typ ?? 'JWT')
          || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 255
          || typeof payload.iat !== 'number' || !Number.isInteger(payload.iat) || payload.iat > now
          || typeof payload.exp !== 'number' || payload.exp <= payload.iat || payload.exp - payload.iat > 3600
          || typeof payload.scope !== 'string' || payload.scope.length > 4096) return null;
        const granted = payload.scope.split(' ').filter((scope) => scopes.some((known) => known === scope));
        if (granted.length === 0) return null;
        const accountId = await resolve(config.issuer, payload.sub, payload.iat);
        return accountId ? { account_id: accountId, scopes: granted } : null;
      } catch { return null; }
    },
  };
}
export function remoteVerifier(config: AuthConfig, metadata: AuthMetadata, resolve: IdentityResolver, requiredClientId?: string): IdentityVerifier {
  return createJwtVerifier(config, resolve, createRemoteJWKSet(new URL(metadata.jwks_uri), { timeoutDuration: 5000 }), requiredClientId);
}
export function bearer(request: Request): string | null {
  const header = request.headers.get('authorization');
  const match = header?.match(/^Bearer ([A-Za-z0-9_\-.]+)$/i);
  return match?.[1] ?? null;
}
export function challenge(config: AuthConfig, error = 'invalid_token', scope?: string): string {
  return `Bearer resource_metadata="${new URL('/.well-known/oauth-protected-resource', config.resource)}", error="${error}", error_description="Connect or reauthorize your Kettle account"${scope ? `, scope="${scope}"` : ''}`;
}
export function protectedResource(config: AuthConfig) {
  return { resource: config.resource, authorization_servers: [config.issuer], scopes_supported: [...scopes], bearer_methods_supported: ['header'] };
}
