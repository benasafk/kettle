# Remaining hosted auth acceptance — Bangkok execution proposal

Prepared 2026-10-06 against `origin/main` at `7203fad`. **Proposed, not executed.**
Bangkok approves the test window, identity/grant targets and mutations, reviews results,
and owns merges/deployment. This PR changes auth tests and this procedure only.

The [current Stage 2 report](stage2-verification.md#hosted-acceptance-update--bangkok-2026-10-06)
supersedes the older setup blockers. Auth0, hosted identity mapping, Kettle deployment,
website/ChatGPT login and later-conversation retrieval are working. User-reported
write denial and refresh continuity are retained as reports, not replaced by new claims.
The [Milestone C brief](assignments/C-project-review-card.md) assigns MCP and panel files
to Integration/UI; neither area is edited here. No runtime change or deployment is needed
to review this proposal.

## Targets and approval record

| Target | Existing identifier / proposed use |
| --- | --- |
| Development origin | `https://kettle-stage2-development.g-baltramiejunas.workers.dev` |
| Issuer | `https://kettle.eu.auth0.com/` |
| A: owner/control | `c4e83ed5-41e7-4fc8-b3b7-eca3f3312c5d`; keep active, do not revoke or block |
| A's reported project | `84c88837-a9d7-4b28-984e-c8c5db51d2ed`, last reported version 2; reread its current version before testing |
| B: proposed affected identity | `4dbb320b-9a7c-4d8f-85ed-75498cb577d1`; website grant revocation and mapping cutoff/block target |
| Website grant | B's verified Auth0 subject + existing **Kettle Development Website** client + Kettle `/mcp` audience |
| ChatGPT grant | Separate existing client; initially a control, never implicitly included in website-grant revocation |

Bangkok must confirm these are still fictional test accounts, that B is not in use by
another workstream, and the exact issuer/subject row and provider client/grant involved.
Account IDs alone do not establish which Auth0 user/grant to mutate. Keep the subject
and client/grant mapping in the operator's private notes; reference aliases in evidence.
If B is needed elsewhere, propose a new disposable test identity through Bangkok and
update this target table before execution. Do not silently substitute a real user.

Approval request for Bangkok (record approved/declined per item in the evidence record):

1. A quiet window with no edits to A's target project while write-isolation evidence is
   captured; one deliberately denied B update with a new request ID and marker text.
2. A restricted-scope provider authorization for B using the existing website client;
   no tenant/app permission changes by default. Any fallback client/grant change needs
   a separate reviewed proposal and restoration plan.
3. Raise only B's mapping cutoff, set its block, then unblock while retaining the cutoff.
   This temporarily affects B's website and ChatGPT credentials for that issuer/subject.
4. Revoke only B's website authorization grant in Auth0; exercise its existing refresh
   credential once, then reauthorize B. Other website sessions for the same grant may
   lose refresh access. Revoke B's ChatGPT grant only in a separately approved sub-run.

No live revocation, identity mutation, client change, hosted write attempt or grant
creation is performed by preparing/merging this document. The user explicitly requires
coordination with Bangkok before execution. No cross-workspace messaging API is available
to this agent; the PR and this approval record are the concrete lead handoff.

## Common preflight and evidence rules

Bangkok records deployed Worker version/commit, database project alias and migration
state, UTC time, operator and approvals. Confirm both identity rows are active and
their original `blocked` and `tokens_valid_after` values. If B already has an intentional
block or a future cutoff, stop rather than overriding it. No migration/reset is needed.

Use separate browser profiles for A/B. Confirm each with same-origin
`POST /api/get_account_state` and `{}` immediately before an action. Body capture may
include fictional account/project IDs, but never cookies, Authorization headers,
tokens, codes, PKCE verifier/state, client secrets, service keys or full callback URLs.
Do not copy raw HARs or provider log payloads into the repo. Sanitization is an allowlist:
retain UTC time, method, path without query, HTTP status, parsed Kettle result, selected
provider event ID/type/error, and non-secret policy settings. Screenshots must exclude
credential fields and private email/subject values.

Use a run ID and explicit actor alias on every row. Distinguish **operator-observed**,
**user-reported**, **local fixture**, **pending**, **failed**, and **inconclusive**.
Never translate a generic browser error into a specific provider error without a
correlated provider event. Export only sanitized `iss`, audience, granted scope names,
`iat`/`exp` and client/subject aliases if Bangkok can inspect verified token claims in
an authorized private environment. Never paste/decode live tokens in chat or third-party
JWT sites. JWT decoding without verification is not authentication evidence.

Execution order: write isolation → limited scope → cutoff/block → recovery → provider
revocation → recovery. Confirm A remains usable between each group. Abort on unexpected
success, wrong identity, configuration drift or missing evidence. Preserve failed-test
evidence; do not auto-retry writes, delete history/receipts, or reset databases.

## H1 — Retained cross-account write rejection

Affected data: the named A project, a single B request ID. No successful write expected.

1. As A, call `get_account_state`, then `POST /api/get_project` with the project ID.
   Retain the entire fictional project snapshot S and current version V, not just tone.
   Ensure nobody else edits it during this test. Bangkok records brief-history count
   and the absence of the planned B request receipt using approved read-only SQL.
2. Prepare a **valid full v1 update** from S: same project ID, `expected_version: V`,
   `name`, `project_type`, complete `brief`, and a fresh UUID `request_id: R`. Change
   only `brief.tone` to `Isolation test — must not persist`. Do not add `account_id` or
   other unknown fields: validation rejection is not ownership evidence.
3. In B's browser, first capture a successful `get_account_state` returning B, then
   send the exact update to `POST /api/save_project` with JSON content type. Use the
   same-origin browser session; no manually pasted credentials are needed.
4. Expected website result: HTTP **400**, body `ok:false`, error **NOT_FOUND**,
   “This project is unavailable.” This handler maps NOT_FOUND to 400, not 404/403.
   A 401, FORBIDDEN or VALIDATION_ERROR does not prove write isolation. If additionally
   run through MCP, retain the actual `tools/call` arguments and structured failure;
   HTTP 200 with `isError:true`/NOT_FOUND is the expected tool-level outcome.
5. As A, reread the project. Require its full snapshot to equal S, including current
   version, brief-version ID and timestamps. Bangkok verifies no added brief version
   and no `write_receipts` row for `(B,R)`. Retain sanitized query results/counts.

Recovery: no mutation should occur. If the write unexpectedly succeeds, stop the run,
notify Bangkok and retain S/R/response. Do not delete append-only history. Bangkok
decides whether to append an explicit corrective revision and investigate the boundary.
This upgrades the previous reported pass only when request, actor, response and
before/after state are retained together.

## H2 — Provider-issued insufficient scope

Affected identity: B; isolated browser session. A's project remains read-only in this step.

1. Start a fresh website PKCE login for B. The operator privately captures the original
   `/authorize` URL from the login redirect in that same browser, changes **only** its
   requested scope to `openid offline_access account:read`, and completes authorization
   while the original transaction cookie remains valid. Keep `client_id`, resource,
   audience, callback, state and S256 challenge unchanged. Do not retain this URL.
2. Confirm the resulting provider-issued access token actually lacks `projects:read`
   and `projects:write`, using private verified-claim inspection or a correlated
   provider grant/exchange record. A requested scope string alone is insufficient:
   prior consent may affect issuance. If that cannot be observed, mark inconclusive.
   Do not forge, edit or locally sign a token to satisfy this hosted check.
3. `POST /api/get_account_state` must succeed as B. `POST /api/get_project` and a valid
   full `POST /api/save_project` must both return HTTP **403**, **FORBIDDEN**. Use a new
   write request UUID; verify no receipt/history change. This proves a valid credential
   is refused for lacking permission; an invalid-token 401 is a different check.
4. If the provider still grants the full scope set, stop. Propose a dedicated bounded
   client grant or scoped test-client configuration to Bangkok, including exact settings,
   callback and cleanup. Do not reduce the shared website/ChatGPT application's permissions
   without a separately approved change. Per-app grants constrain requested permissions;
   they are distinct from user consent. [Auth0 application access policies](https://auth0.com/docs/get-started/apis/api-access-policies-for-applications).

Optional separately recorded MCP check: Bangkok's approved local client uses that real
provider credential in memory to call the existing data tools. Expected HTTP 200 tool
failure with `FORBIDDEN` and `_meta["mcp/www_authenticate"]` containing
`insufficient_scope` and the required scope. Do not extract a website cookie into the
panel or add a runtime token-export route. The website result alone does not prove the
host's scope-upgrade UI; that remains Integration-owned evidence.

Recovery: reauthorize B through normal `/auth/login` with the full requested scope set.
Require B's same internal account ID and normal permitted operations. No persistent
config changes are expected in the default procedure.

## H3 — Hosted cutoff, block and recovery

Affected row: exactly B's `(issuer,subject,account_id)` mapping. Bangkok alone performs
the administrative mutation in its own workspace/approved database tooling. Use a short
transaction for each mutation; commit before HTTP checks so requests can observe it.

1. With B fully authorized, prove a website account call succeeds. If testing MCP too,
   first connect B's separate client and confirm its account ID. Keep these credentials
   unexpired and do not refresh/reconnect during the old-credential check.
2. Bangkok checks exactly one matching mapping row and records old block/cutoff. Raise
   `tokens_valid_after` to `greatest(existing cutoff, current UTC timestamp truncated
   to seconds)`, call that value K. Predicate on exact issuer, subject, B account UUID
   **and previously observed state**; require one affected row. Roll back on zero/multiple
   rows or concurrent drift. Return only account ID, blocked and cutoff to evidence.
3. Using the same still-unexpired B credentials, website account/API calls must return
   401/UNAUTHENTICATED; MCP bearer calls must return 401 with an invalid-token challenge.
   A must still succeed. Correlate with K and the accepted pre-action call so natural
   expiry is not mistaken for cutoff enforcement. If `iat`/`exp` were not captured,
   record the timing limitation; exact `iat == K` evidence then remains local-only.
4. After at least the next clock second, reauthorize B. A provider-issued token with
   `iat > K` must recover the same B account; cutoff is not a permanent account block.
5. Bangkok changes only that row to `blocked=true`, retaining K with the same exact-row
   and previous-state guard. Existing and newly issued B credentials must fail. Even
   valid provider login can end in Kettle's generic callback failure because provisioning
   is denied; pair it with the administrative snapshot rather than calling it an Auth0
   login failure. A remains usable. No extra B identity/account should appear.
6. Recovery: Bangkok restores `blocked=false` for that row with guarded update, **keeping
   K**. Do not lower the cutoff to revive invalidated credentials. Fresh authorization
   issued after K restores B's same UUID; pre-cutoff credentials still fail if unexpired.
   Confirm account and project data were not changed by these identity controls.

If the run is interrupted after blocking, Bangkok unblocks with the same guard, preserves
K and verifies fresh B login. Do not leave B blocked indefinitely or blindly restore an
old row over concurrent administrative changes. Record final state and recovery owner.
These are mapping controls; they do not revoke provider grants, cancel billing or erase
content already delivered to ChatGPT.

## H4 — Controlled provider grant / refresh-token revocation

Affected grant: **B + website client + Kettle audience**, confirmed by Bangkok.
Keep B unblocked and the mapping cutoff unchanged throughout this check. Avoid website
logout: it would clear the credential before the provider-side denial could be tested.

1. Start a new B website session after H3 recovery. Successfully POST `/auth/refresh`
   once and confirm B's account. Use the browser's resulting current cookie thereafter;
   do not replay an old rotating refresh token. Record the existing rotation, expiry and
   **Refresh Token Revocation Deletes Grant** settings without changing them.
2. Bangkok opens Auth0 **User Management → Users → verified B user → Authorized
   Applications**, identifies the website client, and revokes **that application grant**.
   Retain a sanitized provider action/event ID, target alias and UTC time. Do not delete
   B, disable a connection, rotate the client secret, or revoke every user's grants.
   Auth0 documents this as invalidating the application's refresh access.
   [Provider grant revocation](https://auth0.com/docs/secure/tokens/refresh-tokens/revoke-refresh-tokens).
3. Without signing out or reauthorizing, POST `/auth/refresh` using B's latest cookie.
   Expected Kettle response: 401 plus clearing the session cookie. Require a correlated
   provider failed refresh exchange (actual status/error, normally `invalid_grant`).
   Worker 401 or local cookie removal alone is insufficient. If the provider event is
   unavailable, label the provider result inconclusive, not passed.
4. If revocation has not taken effect, retain the observation and stop for Bangkok's
   interpretation rather than repeatedly exercising a rotating credential. Successful
   refresh would replace it, making blind replay confound revocation with reuse detection.
   A 200 revocation acknowledgement alone also cannot prove subsequent token rejection.
5. Test A remains usable. Record B's separate ChatGPT client as a control where available:
   a website grant revocation must not be described as a tested ChatGPT grant revocation.
   Existing access JWTs may continue to pass until expiry/cutoff; Kettle has no provider
   introspection hook. Copied access-token denial is not a prerequisite for refresh denial.
6. Recovery: start a new B login/consent, confirm the same internal account and a successful
   new refresh. Recovery creates new valid refresh access; it cannot restore the revoked
   credential. Confirm the stored project and A's control identity remain unchanged.

If Bangkok approves a **separate B ChatGPT-grant sub-run**, revoke that client grant only
after a fresh host connection and baseline read. Allow the current access token to expire,
then observe an attempted host refresh and provider denial before reconnecting. Capture
provider/host evidence; a reconnect prompt alone cannot identify the cause. Restore by
reauthorizing B and checking its same ID. Record this independently of the website run.

Do not attempt Enterprise-only refresh-token management features or change tenant-wide
revocation policy for this test. If token-specific revocation rather than the available
grant action is required, propose its exact supported endpoint/target and blast radius
to Bangkok first. Rotation replay can revoke a token family; it is a distinct experiment,
not a substitute for controlled grant revocation.
[Auth0 rotation/reuse behavior](https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation).

## Retained result and completion criteria

Use [the blank result record](evidence/auth-remaining-result-template.md). One run needs
approval references, exact actor/target aliases, preconditions, sanitized requests and
responses, provider events where required, before/after data and recovery outcome.
Bangkok reviews evidence before updating shared acceptance status. No raw credential
artifacts should be committed or transferred between workspaces.

| Check | Current status in this PR |
| --- | --- |
| H1 retained hosted write rejection | Pending controlled repeat; earlier user-reported pass remains valid as a report |
| H2 provider-issued limited-scope denial | Pending lead-coordinated authorization/evidence |
| H3 hosted cutoff/block/recovery | Pending Bangkok approval and mutations |
| H4 provider grant/refresh revocation | Pending Bangkok approval and provider action |
| Separate ChatGPT grant revocation | Pending separate approval and host/provider evidence |

Local additions check denied-write receipt/state invariants, limited-scope write denial,
new-token block enforcement, unaffected second identity, and recovery that preserves the
cutoff/account/project. Website fixtures check revocation uses the latest rotated token
and does not imply immediate access-token invalidation. These are regression tests,
not execution of H1–H4 against hosted services.

## Local verification for this proposal

On 2026-10-06 in Nagoya, the previously clean branch
`gustasbull/npm-setup-and-check-v2` fast-forwarded from `c4487f2` to `7203fad`.
No reset, rename, existing-work removal or shared-file edit occurred. A transient Git
index lock cleared before the successful retry; no lock file was removed by the agent.

`npx tsx --test tests/auth-persistence.test.ts` passed. The final `npm run check`
passed **54 tests**, TypeScript, dry-run bundle and local workerd smoke. `git diff --check`
passed. Auth0 is mocked in the website tests, RSA tokens are locally signed, and the
SQL integration uses PGlite. No hosted mutation, revocation, token exchange, merge or
deployment was performed. CI results are recorded separately on the PR.
