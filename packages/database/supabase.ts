import type { ProjectRepository } from '../application/operations.ts';

/** HTTPS PostgREST RPC adapter, portable to Workers. Server-side service role only.
 * Stage 2 must wire it ONLY behind createOperations with a real IdentityVerifier. */
export function createSupabaseRepository(
  baseUrl: string, serviceRoleKey: string, fetcher: typeof fetch = fetch,
): ProjectRepository {
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) {
    throw new Error('Supabase requires HTTPS, except local development');
  }
  if (!serviceRoleKey) throw new Error('Missing server credential');
  return {
    async call(operation, accountId, input) {
      const response = await fetcher(new URL(`/rest/v1/rpc/kettle_${operation}`, url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ p_account_id: accountId, p_input: input }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error('Database request failed');
      return response.json();
    },
  };
}
