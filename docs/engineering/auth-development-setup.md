# Auth0 development setup and hosted acceptance

Prepared 2026-10-06 for Stage 2 A. These are instructions for the existing implementation,
not evidence of completed API/client configuration or hosted OAuth. Auth0 remains provisional.
See [implementation](auth-stage2.md) and [Nagoya evidence](auth-nagoya-evidence.md).

## Confirmed development target and Bangkok ownership

| Value | Required value / current status |
| --- | --- |
| `DEV_ORIGIN` | `https://kettle-stage2-development.g-baltramiejunas.workers.dev` (user-confirmed) |
| API identifier / `AUTH_AUDIENCE` | `https://kettle-stage2-development.g-baltramiejunas.workers.dev/mcp` |
| Website callback | `https://kettle-stage2-development.g-baltramiejunas.workers.dev/auth/callback` |
| Auth0 issuer / `AUTH_ISSUER` | `https://kettle.eu.auth0.com/` (public discovery verified) |
| ChatGPT callback | Copy from the actual MCP connection management screen; not yet observed |
| Hosted database | Bangkok applies `20261006150000_identity_mapping.sql`; user reports last verified not applied |
| Development Worker | `kettle-stage2-development`, Wrangler environment `development`; Bangkok owns Kettle deployment and secrets. Public root currently returns `Hello World!` |

Do not create the API identifier against a guessed hostname. Kettle rejects website
and MCP requests on an origin different from `AUTH_AUDIENCE`. A preview URL or alternate
workers.dev hostname is not interchangeable. The lead must integrate these auth fixes
before deploying and record the deployed commit. Do not copy another workspace's files.

## 1. Tenant and fictional identities

Use the existing tenant **kettle.eu.auth0.com**. The user confirmed that **Kettle
Development Website** already exists as a Regular Web Application, with callback,
logout and origin settings empty; the Kettle API has not been created. Do not create
a second tenant or website application. Keep the default tenant domain throughout
this proof. No paid provisioning is authorized.

Use one database connection for both clients below. Create fictional users A and B
in that connection through the dashboard. Use the exact same user A record in the
website and ChatGPT flows. Signing in with a different social connection, even with
the same email, can produce a different subject and therefore a different Kettle account.
Do not add email linking. Keep passwords in the provider UI/password manager.

In **Settings → Advanced → Settings**, enable **Resource Parameter Compatibility
Profile**. ChatGPT sends `resource`; the website also sends `audience` on authorization,
so a working website alone cannot verify this tenant setting. Confirm both paths issue
the intended API audience. [Auth0 resource compatibility](https://support.auth0.com/center/s/article/mcp-audience-error-with-auth0),
[PKCE authorization parameters](https://auth0.com/docs/api/authentication/authorization-code-flow-with-pkce/authorize-with-pkce).

## 2. Kettle API

In **Applications → APIs**, create `Kettle Development` with:

| Setting | Value for this implementation |
| --- | --- |
| Identifier | `https://kettle-stage2-development.g-baltramiejunas.workers.dev/mcp` |
| Signing algorithm | `RS256` |
| Access-token profile | **Auth0**, which emits `azp`; the website verifier requires it |
| Access-token encryption | Off; the verifier accepts signed JWTs, not encrypted access tokens |
| Token expiration | 300 seconds for the development lifecycle proof; never more than 3,600 |
| Browser-flow expiration, if separately shown | 300 seconds as well |
| Allow Skipping User Consent | Off |
| Allow Offline Access | On |
| Permissions | `account:read`, `projects:read`, `projects:write` |
| RBAC / extra permissions claim | Off for the initial bounded proof; authorization uses `scope` |
| Application Access Policy → User-Delegated Access | Per-app authorization |
| Application Access Policy → Client Access | No apps allowed |

The 300-second TTL and RBAC-off setting are proposed development test settings, not
production policy. If RBAC is enabled later, assign intended API permissions to the
fictional users and test the resulting `scope`; a `permissions` array alone is not
accepted. Do not authorize the automatically created machine-to-machine test app as
a substitute for a user. [API settings](https://auth0.com/docs/get-started/apis/api-settings),
[Auth0 versus RFC 9068 token profiles](https://auth0.com/docs/get-started/architecture-scenarios/server-application-api/part-2).

After creating both applications below, open this API's **Application Access** tab.
Edit each of those two applications, grant **User-Delegated Access**, and select the
three Kettle permissions explicitly. Do not grant client access or default permissions
to all third-party applications. This is a client authorization limit; user consent
and token scopes must still be checked. [API application access policies](https://auth0.com/docs/get-started/apis/api-access-policies-for-applications).

## 3. Website client

Open **Applications → Applications → Kettle Development Website**. Keep its existing
Regular Web Application type and client identity; update these settings:

| Setting | Value |
| --- | --- |
| Allowed Callback URLs | `https://kettle-stage2-development.g-baltramiejunas.workers.dev/auth/callback` |
| Credentials → Authentication Method | Client Secret (Post), i.e. `client_secret_post` |
| Advanced Settings → Grant Types | Authorization Code and Refresh Token |
| OIDC conformant | Enabled |
| Refresh Token Rotation | Enabled |
| Rotation overlap | 0 seconds for the sequential reuse test; record the actual setting |
| Refresh expiration | Enable finite expiry; proposed test maximum 86,400 seconds, idle 3,600 seconds if available |
| Connections | Enable the single fictional-user database connection |
| Allowed Web Origins / Allowed Origins (CORS) | Leave both empty: exchanges run on the Worker |
| Allowed Logout URLs | Leave empty: Kettle does not use Auth0's browser logout endpoint |

Kettle requests `openid offline_access account:read projects:read projects:write`,
uses S256 PKCE, and binds the returned access token to this client's `azp`.
Install its client ID as `AUTH_CLIENT_ID` and its secret as `AUTH_CLIENT_SECRET`
in the development Worker's settings. Never put the ChatGPT client's secret there.
[Credential settings](https://auth0.com/docs/get-started/applications/credentials),
[refresh rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation).

## 4. Separate predefined ChatGPT client

Use the actual custom MCP management screen with endpoint
`https://kettle-stage2-development.g-baltramiejunas.workers.dev/mcp` and the
mode supporting anonymous diagnostic plus OAuth-protected tools. Create a separate
Auth0 application named `Kettle Development ChatGPT`. For a host configuration accepting
a predefined confidential client ID and secret, use **Regular Web Application**,
**Client Secret (Post)**, Authorization Code + Refresh Token, and the same rotation
and connection settings as above. Enter those credentials only in the host's OAuth
configuration UI. They are not Worker environment variables.

Copy the **exact callback URI displayed by the host** into this client's Allowed
Callback URLs. Do not guess a stable callback, reuse the website callback, or add a
wildcard. If the host's offered token-auth mode differs, record it and resolve the
compatibility before proceeding; do not enable DCR or CIMD just to bypass configuration.
Predefined clients are a supported option. Verify actual consent, S256, resource audience,
granted Kettle scopes and whether the host requests `offline_access` and receives refresh
credentials. [OpenAI OAuth configuration and callback rules](https://developers.openai.com/plugins/build/auth).

## 5. Discovery and server settings

Public discovery at `https://kettle.eu.auth0.com/.well-known/openid-configuration`
was fetched successfully on 2026-10-06. Its selected public fields are recorded in
[evidence](evidence/auth0-public-discovery-20261006.json). It meets these requirements:

- Exact `issuer` matching `AUTH_ISSUER`, including the trailing slash.
- `jwks_uri`, `authorization_endpoint`, `token_endpoint`, `revocation_endpoint`:
  HTTPS, same origin as the issuer, without query strings or fragments.
- `code_challenge_methods_supported` containing `S256`.
- `token_endpoint_auth_methods_supported` containing `client_secret_post`.
- If `authorization_response_iss_parameter_supported` is true, callbacks must include
  that exact issuer once. Kettle also rejects a wrong issuer when the flag is absent.

Save only sanitized public discovery metadata and pass/fail notes. A metadata pass
does not prove this application's credentials or grant types work. Report an actual
tenant mismatch rather than patching discovery or loosening JWT checks.

Bangkok installs these **seven secrets** in Worker **kettle-stage2-development**,
Wrangler environment **development**. The existing `wrangler.jsonc` already requires
these names; this branch does not change the shared runtime configuration. The first
two values below are public identifiers, even though the current manifest stores them
as secrets.

| Worker secret name | Exact value or private source |
| --- | --- |
| `AUTH_ISSUER` | `https://kettle.eu.auth0.com/` |
| `AUTH_AUDIENCE` | `https://kettle-stage2-development.g-baltramiejunas.workers.dev/mcp` |
| `AUTH_CLIENT_ID` | Existing **Kettle Development Website** application's client ID |
| `AUTH_CLIENT_SECRET` | That website application's client secret, transferred privately |
| `AUTH_SESSION_SECRET` | Newly generated 64-character hexadecimal secret, unique to development |
| `SUPABASE_URL` | Bangkok's approved hosted development project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | That same project's server-only service-role credential |

The separate ChatGPT client ID/secret belong in ChatGPT's connection settings only.
Do not install them as `AUTH_CLIENT_ID` / `AUTH_CLIENT_SECRET`.
Generate the session secret locally as 32 random bytes encoded into 64 hex characters;
transfer directly into the secret store without printing it to chat or committing it.
Database credentials remain server-only. No tenant or database secret belongs in the
ChatGPT conversation, tool arguments, browser JavaScript, or evidence report.

The lead confirms the hosted identity migration and development deployment. A health
response saying `auth: configured` only means the necessary configuration parsed;
it does not verify discovery, database access or login. Check both protected-resource
metadata routes and actual authenticated operations before marking any hosted pass.

## 6. Hosted proof run

Record UTC time, deployed commit, public origin, migration name, test label, outcome
and sanitized account/project/version IDs. Do not retain passwords, tokens, cookies,
authorization codes, complete callback URLs, secrets, or unredacted network captures.

1. Sign in as A on the website. Record internal account ID. Decline one authorization
   attempt first and confirm it does not grant access.
2. Connect A through ChatGPT. Call `get_account_state`; its ID must equal the website's.
3. Ask: “Save a fictional desk lamp brief: rechargeable, three brightness settings;
   remote workers; show a desk setup; practical tone; English; 20 seconds; one person
   at a home desk; no links.” Use the v1 description-only input in [contracts](contracts.md).
   Record returned project ID/version 1 and the request ID.
4. Correct the audience to “home-office workers” using version 1 and a new request ID.
   Record version 2. Replay the exact version-1 create to confirm its original receipt;
   changed content with that request ID must conflict. A stale update must conflict.
5. Start another ChatGPT conversation, select the same connection, and ask it to reopen
   the recorded project ID. Require version 2 and the corrected audience. No project-list
   tool exists yet; retain the ID explicitly. Record this as a real conversation test.
6. Use B in a separate browser profile/host connection. Confirm a distinct account ID.
   Read and update A's project ID; both must return `NOT_FOUND`. Compare with a random
   nonexistent ID. Reopen as A and confirm unchanged content/version.
7. Exercise the lifecycle matrix below. Complete the report only with observations.

## Lifecycle matrix and limits

| Test | Required observation |
| --- | --- |
| Access expiry | At the recorded token expiry, reuse of that access token fails with 401; distinguish automatic host refresh from acceptance of an expired token |
| Missing scope | A provider-issued token with only `account:read` cannot read/save projects; MCP emits `insufficient_scope`. Obtain via provider consent/test client, never editing a JWT |
| Website refresh | Same-origin POST `/auth/refresh` rotates credentials and keeps the same account. No automatic retry; rejected exchange clears the cookie and requests reconnection |
| Cookie expiry | The website session lasts one hour; refresh before then or sign in again. A 300-second API TTL does not extend cookie lifetime |
| Reconnect | Fresh authorization for the same issuer/subject returns the same account and version-2 brief; the other subject remains isolated |
| Website logout | Clears local cookies and attempts refresh revocation. It does not end Auth0 SSO or disconnect ChatGPT |
| Provider outage | Local logout still clears cookies; 502 says provider revocation is unconfirmed/unavailable |
| Provider refresh revocation | Revoke A's specific application grant in Auth0; verify a subsequent refresh is rejected. Record the client and tenant revocation setting |
| ChatGPT disconnect | Observe what the host/provider actually revokes. Reconnect and verify identity. Do not infer immediate access-token invalidation from disappearance of the connection |
| Local cutoff/block | Lead-controlled test: `iat <= tokens_valid_after` fails; later issuance can pass a cutoff; `blocked=true` also rejects newer tokens. Test separately from provider revocation |

Kettle does not introspect tokens or process provider revocation webhooks. A copied
cookie/access token may work until access expiry (at most one hour) unless the SQL
mapping blocks it or advances its cutoff. Clearing one browser cookie is not global
revocation. Capture **Refresh Token Revocation Deletes Grant** in Tenant Settings →
Advanced; Auth0 documents different revocation scopes depending on settings and endpoint.
For the bounded test, leave it off and record the actual outcome rather than promising
one-device-only logout. [Auth0 refresh revocation](https://auth0.com/docs/secure/tokens/refresh-tokens/revoke-refresh-tokens).

Incomplete API/client configuration, hosted migration, deployment, or host access leaves
the corresponding tests **blocked**, not passed by local fixtures. No production
deployment, purchase, public listing or live generation is part of this run.
