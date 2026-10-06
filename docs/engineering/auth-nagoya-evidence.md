# Stage 2 A continuation — Nagoya evidence and handoff

Date: 2026-10-06. **Local continuation complete; hosted authentication acceptance blocked.**
Auth0 remains provisional. The user has now confirmed the tenant `kettle.eu.auth0.com`,
canonical origin `https://kettle-stage2-development.g-baltramiejunas.workers.dev`, and
existing Regular Web Application **Kettle Development Website**. Its URL settings are
empty and the Kettle API is not configured. Bangkok owns deployment and applying the
identity migration, last verified not applied to hosted development Supabase. The
ChatGPT callback remains pending.

## Branch and implementation

- Branch preserved: `gustasbull/npm-setup-and-check`.
- Starting HEAD: `1e4c76a2a5c697942af8e37400e2144ed050cefe`.
- `git merge-base --is-ancestor 335354f HEAD`: exit 0 before work.
- Implementation commit: `67bb3bf51ff9805b1b7281bda276e653f330766d`.
- This report and the setup guide are a subsequent documentation commit on the same branch.

The existing foundation, v1 contracts, application operations, migrations, dependencies,
runtime configuration, references and diagrams were preserved. No identity bypass was
introduced. New private keys and subjects exist only in test code generated per run.

## Findings and changes

The new integrated test first failed on a successful `get_account_state` MCP call:
the SDK returned an error containing `Cannot read properties of undefined (reading '_zod')`
instead of structured output. The pinned SDK normalizes output schemas as Zod objects;
Kettle registered a discriminated union. Existing MCP tests exercised error results,
which the SDK skips during output validation, so the baseline passed despite this bug.

`apps/worker/mcp.ts` now registers the existing contract's success-object branch with
the SDK. `createOperations` still validates the complete success/failure contract,
and `tools/list` still publishes the original union. No shared schema or dependency
change was necessary. All three successful product tools now run through the wire test.

OAuth callback validation now rejects repeated `iss`, including when the first value
is correct. Regression assertions also cover repeated code/state without token exchange.

The [setup guide](auth-development-setup.md) gives dashboard settings for a custom API,
two separate predefined clients, application access grants, one fictional-user connection,
RS256/Auth0 token profile, S256, resource compatibility, exact callbacks, rotation and
server secret destinations. It includes an ordered hosted transcript procedure and
accurate lifecycle expectations. Official sources were read on this date. Public tenant
discovery has now been observed; client login/token/lifecycle behavior has not.

## Personally run checks

Environment: local macOS, Node `v26.8.2`.

| Check | Observed result |
| --- | --- |
| Initial `git status --short` | Clean |
| `npm run setup` | Passed, zero audited vulnerabilities; npm reported install-script allowlist warnings |
| Baseline `npm run check` | Passed: 41 tests, typecheck, dry-run build, workerd smoke |
| Initial new integration test, before MCP fix | Failed on successful MCP output normalization as described above |
| `npx tsx --test tests/auth*.test.ts`, after MCP fix | 11 passed before the two additional lifecycle tests |
| `npm run check` on the implementation committed as `67bb3bf` | Passed: 44 tests, typecheck, dry-run build, workerd smoke |
| Latest `npm run check`, including captured tenant metadata and required callback issuer regression | Passed: 45 tests, typecheck, dry-run build, workerd smoke |
| `git diff --check` | Passed |

The standard smoke covers local workerd health/website, diagnostic MCP initialize/list/call,
unconfigured product-tool absence, origin denial, fixture Workflow completion, and fixture
RSA/PKCE/encrypted-cookie behavior. Successful authenticated MCP/SQL integration runs in
Node/PGlite, not a deployed Worker. These are local results; PR CI is recorded separately
in GitHub and is not hosted OAuth evidence.

## Acceptance matrix

| Acceptance | Local observation | Hosted status |
| --- | --- | --- |
| Website and ChatGPT credentials resolve to one account | Real RSA JWT validation, website client binding, cookie callback and actual mapping SQL; separate client IDs resolve the same issuer/subject to one UUID | Pending API/client configuration, migration and Kettle deployment |
| Description-only save and later retrieval | All three MCP tools succeed; create version 1, update version 2, rebuild verifier/application/transport, retrieve version 2; website API reads the identical snapshot | Blocked: no actual second ChatGPT conversation |
| Second-account isolation | Different signed subject maps to another UUID; guessed A ID read/write return `NOT_FOUND`; read equals nonexistent-ID result; history remains two versions | Blocked on hosted combined path |
| Expiry and scopes | Expired signed access token receives HTTP 401; insufficient scope yields MCP challenge and no project storage call | Provider-issued expiry/consent/scope denial not run |
| Refresh and reconnect | Mocked refresh rejection clears cookie with no retry; fresh PKCE login resolves same fixture account; existing rotation/client-switch checks pass; newly issued same-subject token preserves SQL identity | Real provider/host refresh and reconnection not run |
| Local revocation | Actual mapping cutoff rejects older/equal `iat`; later-issued token passes cutoff; block rejects it; website also observes cutoff | Lead-controlled hosted cutoff/block test pending |
| Provider revocation | Mocked revocation outage returns 502 and clears cookies; copied session remains usable until local block; existing mocked revoke-call test passes | Actual grant/refresh revocation and ChatGPT disconnect not run |
| `npm run check` | 45 passed plus typecheck/build/smoke | No hosted claim |

`tests/auth-persistence.test.ts` runs the real migrations and service-role SQL functions
in isolated PGlite. Token exchange is mocked, JWT keys are generated locally, and SQL
is called directly through a test repository. It does not test Auth0 discovery/JWKS,
PostgREST networking, multiple database connections, remote persistence or ChatGPT.
Prior lead database evidence remains in [Stage 2 verification](stage2-verification.md);
it was not rerun or upgraded to an OAuth claim here.

The provider-revocation limitation is unchanged: JWT verification does not introspect
grants. Website logout clears the current browser cookie but cannot invalidate copied
cookies/access tokens immediately. Access expiry, local cutoff and blocking are distinct
controls. No disconnect webhook or immediate global provider revocation claim is made.

## Coordination status and remaining blockers

The user supplied the canonical URL and ownership update from Bangkok. The exact
secret names and public values are now in the [setup guide](auth-development-setup.md).
The existing development manifest already declares all seven required names, so no
shared runtime configuration, dependency, contract, application or migration edit is
proposed by this branch. This report and the PR provide the handoff; no direct
cross-workspace messaging tool is available in this session.

1. Auth0 operator: configure the Kettle API and existing website client using the exact
   settings in the guide. Keep website logout and origin/CORS fields empty; set only
   the exact callback URL. Configure a separate ChatGPT client when its callback is
   available. Do not recreate the tenant or existing website application.
2. Bangkok lead: integrate this branch's reviewed changes; apply
   `20261006150000_identity_mapping.sql` to the intended hosted development project.
   Its last verified hosted state is **not applied**, per the user's update.
3. Bangkok lead: install the seven development secrets from the guide and deploy Kettle
   to the confirmed development Worker, replacing Hello World. Record the deployed
   commit and migration result. Keep credentials in the existing secret stores.
4. User/host operator: supply the exact public callback shown by ChatGPT; enter its
   separate client credentials only in the host's configuration UI.
5. Auth owner: after deployment/migration/configuration, execute the hosted A/B identity,
   second-conversation save/read, isolation and lifecycle procedure. Record sanitized
   results individually; none has passed merely because metadata or local tests pass.

## Public endpoint observations after the target was confirmed

On 2026-10-06 at approximately 12:42 UTC, a read-only GET of the tenant's OIDC discovery
returned HTTP 200. Issuer is exactly `https://kettle.eu.auth0.com/`; authorization, token,
revocation and JWKS URLs are same-origin HTTPS; S256 and `client_secret_post` are advertised.
`authorization_response_iss_parameter_supported` is true, so this website callback must
include the exact `iss`. Selected public fields and their capture timestamp are saved in
[evidence/auth0-public-discovery-20261006.json](evidence/auth0-public-discovery-20261006.json).
The offline regression replays that metadata through the existing discovery validation;
it neither verifies client settings nor requests tokens. No verifier changes were needed.

A read-only GET of the confirmed Worker root returned HTTP 200 with `Hello World!`.
This verifies the existing public endpoint only. Kettle routes, OAuth consent/exchange,
Supabase identity mapping, real refresh/revocation and ChatGPT conversations remain
**pending**. Hosted database state is user-reported, not rechecked by this agent.

No deployment, paid provisioning, product publication, provider outreach, live generation,
remote database mutation, or cross-workspace secret copying was performed. Foundation
rebuilding is unnecessary. Hosted acceptance and full A44 remain open.
