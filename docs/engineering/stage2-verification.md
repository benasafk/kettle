# Stage 2 implementation and evidence — 2026-10-06

Stage 2 is **in progress, not complete**. The local database gap is closed. Real
ChatGPT OAuth and live generation/provider evaluation still have external dependencies.

## Starting point and ownership

The lead personally verified that HEAD `e90e995` contains foundation `563b3ed` and
reran `npm run check`: the original 17 tests, TypeScript, dry-run Worker bundle,
MCP smoke and local Workflow all passed. The attachment's Docker/Supabase status
was older than the repository: hosted Supabase had already been reported verified.
Docker 29.7.2 was available during this run.

Two bounded implementation agents worked in this same foundation-containing checkout.
A owned auth/website/MCP and its tests; B owned generation/reference adapters and
evaluations. The lead owned configuration, dependencies, migrations, database proof,
integration and independent review. No branch was renamed. No additional workspaces,
secret copies, remote reset, production deployment or public listing were created.

## Personally verified database results

`npm run db:start` started the path-derived local Supabase stack, applying the
foundation migration and fictional seed. `npm run db:migrate` appended
`20261006150000_identity_mapping.sql`. No applied migration was edited.

`npm run db:test` passed against the actual local PostgREST and PostgreSQL services:

- Account-scoped saves and reads, including read from a fresh Node application process.
- Immutable receipt replay, stale-version and changed-payload request-ID rejection.
- Cross-account read/write denial.
- Four simultaneous HTTP saves produce one result; competing edits produce one winner.
- A receipt-insert failure rolls back the updated pointer and inserted brief; retry
  with the identical request succeeds. The test trigger targets one generated account/request.
- Concurrent first-login resolution creates one identity/account; cutoff and block
  deny resolution; client roles cannot execute the mapping RPC.
- Generated test records and trigger removed; existing data preserved.

Observed local test duration: 721 ms including child-process and SQL overhead. This
is not a product benchmark. This test validates persistence across an application
process replacement, not a database restart or a hosted Worker restart.

The lead also personally reran `KETTLE_TEST_PROJECT_REF=fdicggstdtthfpcrpujf npm run
smoke:supabase` against the already-authorized hosted development database. It passed
account/save/read, concurrent writes, versioning, client denial and cleanup in 4797 ms
including CLI/network overhead. Identity was injected by the test, not real OAuth.
The new identity migration is applied locally only; hosted application is pending.
The local stack was stopped after verification using `npm run db:stop`; its data
was preserved for the next `db:start`.

## Authentication review and limits

Integrated `npm run check` passed: **40 tests**, TypeScript, Worker dry-run build,
and workerd smoke. The smoke includes actual workerd RSA signing/verification,
PKCE/state and encrypted-cookie callback roundtrip with a fixture provider.
This verifies runtime cryptography, not a live identity provider or ChatGPT client.
The development-target dry-run bundle and fixture evaluation command also passed.
Checks ran locally on Node 26.8.2; the Node 22 CI job was not run remotely.
A final review also made project RPC redirects fail closed to prevent forwarding
server credentials to an unexpected destination.

See [implementation decision and setup](auth-stage2.md). The lead reviewed the token
boundary, scope checks, issuer/subject mapping, website state/PKCE, cookie encryption,
refresh identity binding, origin checks, MCP challenges and SQL permissions separately
from the implementation agent. Successful local tests do not prove provider or host
compatibility. Production code has no fixture identity switch.

Auth0-compatible implementation is provisional pending actual development integration.
The user confirmed no Auth0 tenant/application exists. Website logout clears the
browser cookie and attempts refresh-token revocation; already issued access tokens
remain subject to expiry and the local database cutoff/block policy. A copied session
cookie is not globally invalidated merely by clearing the original browser cookie.

Cloudflare account access was observed read-only; its Worker list was empty. A
`development` Wrangler environment is prepared with required secrets and logs/traces.
It has not been deployed. The default remains diagnostic-only without complete auth
configuration. No hosted ChatGPT connection or cross-conversation save/read is claimed.

## Generation and costs

See [generation evidence](generation-stage2.md) and [fixture outputs](../../evals/results.fixture.json).
Fixtures are authored examples, not model/provider observations. The OpenAI adapter
is opt-in; the normal evaluation command cannot make paid calls. No supplied URL is
fetched automatically. Provider rights are not inferred from technical access.

The user authorized **$25 total** for live OpenAI/Lightreel/ScrapeCreators/EnsembleData
tests including retries. Actual paid provider calls: **0**; provider spend: **$0**;
unspent cap: **$25**. No API keys were available in the environment or workspace
secret files. Lightreel's connected research action lacks a verified per-call maximum
in the reviewed documentation, so it was not invoked. Existing infrastructure costs
are not measured or included in the reported zero provider spend.

## Remaining acceptance and next assignments

1. Create/configure an identity-provider development tenant: website client, Kettle
   resource scopes, RS256 tokens with <=1-hour lifetime, refresh policy, and the exact
   callback/client shown by ChatGPT. Store secrets locally or in a secret manager.
2. Apply the reviewed identity migration to the intended hosted development project;
   configure/deploy the development Worker after confirming its concrete target.
   Prove two fictional accounts, actual website and ChatGPT login, refresh/reconnect,
   cross-account denial, save, and retrieval in a new ChatGPT conversation.
3. Supply an OpenAI development key and selected model; establish a conservative
   per-call price/token bound within the shared $25 cap. Run approved real briefs and
   compare outputs with plain ChatGPT. Obtain provider credentials and permitted-use
   evidence before live reference evaluation. No additional cap is needed unless
   the approved $25 is exhausted or scope changes.
4. Only after these proofs, integrate Stage 3 production job records, pending-dispatch
   reconciliation, retry/cancellation and usage settlement. The existing fixture
   Workflow is not full A44. Adopt product scope before Studio/Vault/UI expansion.

Release audience, Paper exports, quality thresholds and good/bad script examples
remain product inputs. Billing and public distribution remain separate later work.
