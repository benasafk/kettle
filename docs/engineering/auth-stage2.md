# Stage 2 authentication implementation and remaining proof

Date: 2026-10-06. Status: local implementation; **hosted OAuth acceptance remains open**.
The user confirmed that no Auth0 tenant/application exists. No tenant was created,
remote auth setting changed, Worker deployed, or paid auth test performed.

## Decision and evidence

Use an established OAuth authorization server. The implemented resource-server and
website client target Auth0's RS256 custom-API token profile. This is a conditional
engineering choice pending a development tenant and the actual ChatGPT proof; it is
not a claim that Auth0 has been tested with Kettle. Supabase remains the database.

The fixed v1 permissions are `account:read`, `projects:read`, `projects:write`.
Supabase's current [OAuth flows documentation](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows)
says custom scopes are unsupported and lists only identity scopes. Default access
tokens use `authenticated` as audience. That documented gap prevents adopting the
unmodified provider flow for these contracts. It is not an observed rejection from
ChatGPT, nor a general claim that Supabase cannot support MCP. Its
[MCP guide](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
documents discovery, PKCE, pre-registered/DCR clients and rotating refresh tokens.
Its [token security guide](https://supabase.com/docs/guides/auth/oauth-server/token-security)
allows audience customization with token hooks, but an audience hook alone does not
establish consent to Kettle's three permissions. We did not invent equivalent scopes,
add a custom OAuth server, or weaken resource validation.

[OpenAI's authentication contract](https://developers.openai.com/plugins/build/auth)
requires protected-resource discovery, S256, resource-bound credentials and verified
scopes. It supports predefined clients as well as DCR/CIMD. Exact redirects come from
the host management page; advertised issuer identification must match the callback.
Auth0 [documents resource-parameter compatibility](https://auth0.com/blog/adding-ui-auth0-secured-mcp-server-skybridge/)
for MCP and [access-token audience/scope validation](https://auth0.com/docs/secure/tokens/access-tokens/validate-access-tokens).
The initial bounded connection can use a separately pre-registered ChatGPT client;
it does not require opening dynamic registration to everyone.

| Requirement | Implementation / documented evidence | Observed hosted evidence |
| --- | --- | --- |
| Protected-resource metadata | Root and path-specific metadata routes; canonical HTTPS `/mcp` resource, issuer, scopes | None |
| Authorization metadata | Exact issuer; HTTPS, same-origin endpoints; S256 and `client_secret_post` required | No Auth0 tenant |
| PKCE + redirect + state | Website uses random verifier/state, S256 and fixed website callback; rejects mixed issuer/duplicate parameters | Fixture exchange only |
| MCP client registration | Predefined client recommended initially; host supports DCR/CIMD too | No client registered |
| Audience + scope consent | Fixed v1 scopes, strict resource audience; ID-token/client audience rejected | No consent/token capture |
| Shared account | Verified `(issuer, subject)` mapping, unique SQL identity; never email or client input | DB proofs tracked in Stage 2 verification |
| Refresh/reconnect | Website POST refresh checks same account and website `azp`; MCP lifecycle belongs to host/provider | Mocked token exchange only |
| Revocation | Per-call local blocked/cutoff check; provider refresh revocation on website logout | No real disconnect or provider revocation test |

## Implemented boundary

`packages/auth` has no Cloudflare bindings. Runtime composition reads trusted server
configuration and supplies the real verifier to `createOperations`. Both HTTP and
MCP use the same repository. Signing keys come only from pinned-issuer discovery;
untrusted JWT headers never choose a fetch destination. Tokens must have RS256
signatures, exact issuer, resource audience, valid `exp`/`nbf`, required integer `iat`,
nonempty bounded subject, and a lifetime of at most one hour. At least one Kettle
scope is required before account provisioning; machine-to-machine credentials and
explicit non-access token-use claims are rejected; the application enforces each tool's
specific scope. Website verification also requires `azp` equal to the website client.

The lead-owned mapping migration introduces `kettle_resolve_identity` with issuer,
subject and issued-at parameters. Atomic provisioning returns one internal UUID.
Every verified request checks `blocked` and `tokens_valid_after`; `iat <= cutoff`
is rejected. Only trusted service-role RPC calls can resolve/provision identities.
No token parsing, account IDs, email matching, dev headers or bypass flags can create
ownership. Supabase client roles cannot call these owner-parameter RPCs.

With configuration absent or invalid, the Worker exposes only `kettle_diagnostic`.
With complete configuration, the Worker discovers/verifies its issuer and registers
the three v1 product tools. A failed discovery returns 503; invalid presented bearer
credentials receive HTTP 401 with a resource-metadata challenge. Missing credentials
on product tool calls return the tool-level challenge needed for host authorization.
Insufficient scopes return an `insufficient_scope` challenge. Input/output schemas,
read/write annotations, useful text, and structured results are included.

The pinned MCP SDK's high-level registration only serializes `_meta.securitySchemes`.
A public `ListToolsRequestSchema` handler emits both top-level schemes and the mirror;
wire tests assert both. This follows the
[OpenAI tool reference](https://developers.openai.com/plugins/reference).

Website routes are `/auth/login`, `/auth/callback`, `/account`, `/auth/refresh`,
`/auth/logout` and `/api/{get_account_state,get_project,save_project}`. Cookies are
AES-GCM authenticated/encrypted, `__Host-`, Secure, HttpOnly and SameSite=Lax. The
ten-minute OAuth transaction and one-hour session have distinct audience purposes.
The cookie bound is 3,800 characters; oversized provider tokens fail closed.
Website POSTs require the exact Origin; JSON operations also require JSON content.
There is no permissive CORS route. Access/refresh credentials and service keys are
never printed in HTML or returned by the API. Account access and API calls use
`createOperations`; the minimal website does not include a full project editor.

The account page distinguishes website login from ChatGPT authorization and displays
the configured MCP URL. The current [private connection route](https://developers.openai.com/api/docs/guides/custom-mcp-server)
is ChatGPT Plugins → Add custom MCP server, then install/select the resulting plugin.
It uses mixed authentication for anonymous diagnostic/discovery and protected product
tools. Availability depends on the user's workspace. No public listing is invented.

## Token lifecycle limitations

Logout clears the website cookies and attempts provider refresh-token revocation.
A provider outage reports local logout with revocation unconfirmed. Refresh is an
explicit same-origin POST, not automatic concurrent retries. A rejected refresh
clears the local session and asks for reconnection. Short-lived sessions require
refresh before their one-hour cookie expiration, otherwise a new login.

JWT verification does **not** prove immediate provider revocation. A copied cookie
or bearer access token may work until expiry (maximum one hour) unless the mapping
is locally blocked or its cutoff advances. Provider refresh-token revocation and
access-token invalidation are distinct; see
[Auth0 refresh revocation](https://auth0.com/docs/secure/tokens/refresh-tokens/revoke-refresh-tokens).
A cutoff rejects older access tokens; a later successfully issued token can pass.
Blocking the mapping also rejects later tokens. No admin UI, provider revocation
webhook, per-client grant revocation, or disconnect-to-cutoff integration is included.
These are explicit gaps before claiming immediate ChatGPT disconnect enforcement.
Signing-key rotation is supported by remote JWKS retrieval but has not been observed
against a real tenant. Reconnections must reuse the same issuer-subject identity.

## Development setup to unblock the real proof

These are setup requirements, not actions already performed. No production tenant
or purchase is requested. Approve a concrete development Worker target and any costs
before deployment. The $25 authorization covers generation/reference providers;
it does not authorize paid identity-provider provisioning.

1. Supply a development Auth0 tenant. Create a custom API whose identifier is exactly
   the selected `https://<development-host>/mcp`. Choose RS256, maximum access-token
   lifetime 3,600 seconds (prefer shorter for lifecycle tests), and define all three
   Kettle permissions. Require consent. Enable resource-parameter compatibility for
   MCP and verify `resource` reaches the same token audience; do not silently accept
   the default userinfo audience. Allow offline access for refresh testing.
2. Create a separate regular web application using authorization code + S256, refresh
   rotation and `client_secret_post`. Allow exactly
   `https://<development-host>/auth/callback`. Enable only the intended fictional-user
   connection. Verify access tokens contain that application's `azp` and API scopes.
3. Inspect `https://<tenant-domain>/.well-known/openid-configuration`. Its `issuer`
   must match exactly including trailing slash. This implementation requires same-
   origin HTTPS authorization, token, revocation and JWKS endpoints; advertised S256
   and `client_secret_post` must be present. Do not patch the metadata in Kettle to
   hide provider incompatibility. Capture sanitized metadata as development evidence.
4. Store these server variables through local ignored environment files or Worker
   secrets, never source control or chat:

   | Variable | Value |
   | --- | --- |
   | `AUTH_ISSUER` | Exact discovery issuer, e.g. `https://<tenant-domain>/` |
   | `AUTH_AUDIENCE` | Exact canonical HTTPS URL ending `/mcp` |
   | `AUTH_CLIENT_ID` | Website application's client ID |
   | `AUTH_CLIENT_SECRET` | Website application's secret |
   | `AUTH_SESSION_SECRET` | 32 random bytes encoded as 64 hexadecimal characters |
   | `SUPABASE_URL` | Approved development Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-only service-role credential |

5. For the actual ChatGPT management screen, obtain its exact callback URI and create
   a separate predefined OAuth client with that exact allowlist. Do not reuse the
   website client/secret. Follow the host's supported registration/token-auth mode;
   copy its actual callback rather than guessing stable versus callback-ID-specific.
   Verify its consent screen requests only the Kettle scopes needed, PKCE uses S256,
   resource matches the API, and refresh/reconnection work. Record the chosen client
   mode and sanitized metadata, never credentials/tokens.
6. Use two fictional users. Sign in on the website, record each internal account ID,
   connect user A in ChatGPT, save version 1, correct to version 2, and retrieve it in
   another conversation. Verify website identity matches; user B must receive the
   same unavailable result for guessed A IDs. Test declined consent, expired/wrong-
   audience/insufficient-scope tokens, duplicate writes, refresh, disconnect and
   reconnection. Test local blocked/cutoff separately from provider revocation.

## Local verification and remaining acceptance

Personally run: strict `npx tsc --noEmit`; nine auth tests in
`npx tsx --test tests/auth*.test.ts` pass. These use real RSA signing/verification,
local JWKS, JWE encryption/decryption, and intercepted OAuth HTTP responses. They
cover tampered/wrong issuer/wrong audience/expired/future/oversized-lifetime credentials,
missing scopes, website client binding, issuer mismatch, CSRF, cookie tampering,
successful account/API access, refresh account switching, denied consent, mapping
revocation, ownership injection and MCP challenge/descriptor behavior.

`scripts/auth-runtime-check.ts` is a test-only local workerd proof of RSA JWT, PKCE,
callback and encrypted-cookie APIs with a mocked token exchange. It is never imported
by the production Worker. The lead records its runtime result with combined checks.
Database migration/network/restart/concurrency proofs are recorded by the lead.

Not complete: hosted website sign-in, actual Auth0 discovery/token exchange/consent,
ChatGPT private connection, save/read across conversations, real provider refresh and
revocation, and combined hosted Worker-to-Supabase behavior. No sanitized hosted
transcript or development deployment URL exists yet. These remain acceptance gates,
not assumed passes from unit tests or the prior hosted database proof.
