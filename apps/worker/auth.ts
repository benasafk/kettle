import { createCreatorOperations } from '../../packages/application/creator-operations.ts';
import { createCreatorSupabaseRepository } from '../../packages/database/creator-supabase.ts';
import { createOperations } from '../../packages/application/operations.ts';
import { discover, remoteVerifier, validateConfig, type AuthConfig } from '../../packages/auth/index.ts';
import { createSupabaseIdentityResolver, createSupabaseRepository } from '../../packages/database/supabase.ts';

export function authConfig(env: Env): AuthConfig | null {
  const { AUTH_ISSUER, AUTH_AUDIENCE, AUTH_CLIENT_ID, AUTH_CLIENT_SECRET, AUTH_SESSION_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;
  if (![AUTH_ISSUER, AUTH_AUDIENCE, AUTH_CLIENT_ID, AUTH_CLIENT_SECRET, AUTH_SESSION_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY].every(Boolean)) return null;
  try {
    return validateConfig({ issuer: AUTH_ISSUER!, resource: AUTH_AUDIENCE!, clientId: AUTH_CLIENT_ID!, clientSecret: AUTH_CLIENT_SECRET!, sessionSecret: AUTH_SESSION_SECRET! });
  } catch { return null; }
}
export async function authServices(env: Env, config: AuthConfig) {
  const metadata = await discover(config);
  const verifier = remoteVerifier(config, metadata, createSupabaseIdentityResolver(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!));
  const operations = createOperations(verifier, createSupabaseRepository(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!));
  const creatorOperations = createCreatorOperations(verifier, createCreatorSupabaseRepository(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!));
  const websiteVerifier = remoteVerifier(config, metadata, createSupabaseIdentityResolver(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!), config.clientId);
  const websiteOperations = createOperations(websiteVerifier, createSupabaseRepository(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!));
  return { config, metadata, verifier, operations, creatorOperations, websiteVerifier, websiteOperations };
}
