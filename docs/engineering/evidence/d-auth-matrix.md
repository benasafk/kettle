# D0 — Auth authorization readiness

Nagoya, 2026-10-09. Input/base: `706002f` (Milestone D kickoff).
Branch: `gustasbull/npm-setup-and-check-v3`; clean before fast-forward from `c173646`.
No reset, branch rename or existing edit removal. This is an authorization proposal
for Bangkok review, not adopted D contracts or completed D acceptance.

## Authorization matrix for D0 review

All rows require a verified issuer/audience/signature/expiry and current issuer-subject
mapping. Website and ChatGPT credentials resolve independently to the same internal
account. Recheck scope and mapping on every request, including successful receipt
replays. Neither public social URLs, provider payloads, account IDs in arguments nor
host/panel state establish ownership. Authentication is distinct from content-use
permission, commercial entitlement and development spend authorization.

Scope labels below are **proposals**, not registered OAuth permissions or public tool
names. Bangkok owns adoption, shared schemas, storage and job policy. All D operation
tests are **pending merged executable operations**, even where v1 analogues pass.

| Proposed operation | Account ownership checks | Proposed scope | Version / request-ID behavior | Required denial and side-effect evidence (pending D operations) |
| --- | --- | --- | --- | --- |
| Start profile scan | Own profile association and target project; a shared public URL never grants another account's scan | `profiles:write` | Account-scoped request receipt; bind exact input/profile/brief versions where used; explicit start only | Foreign parent/association unavailable; no durable intent, dispatch, budget reservation or provider attempt on denial |
| Read scan observations | Own scan and association; each observation reachable only through authorized context | `profiles:read` | Immutable dated observations; reads need no write request ID | Guessed scan/observation ID unavailable; no provider fetch, private provenance leak or receipt |
| Read DNA | Own profile and requested DNA version | `profiles:read` | Return exact requested/current version according to adopted contract; no generation on reopen | Foreign DNA/version unavailable, no claims/evidence IDs leaked |
| Correct DNA | Own profile, DNA and referenced evidence context | `profiles:write` | Expected current version + account-scoped request ID; append version; do not rewrite prior batch inputs | Stale authorized correction conflicts; foreign IDs do not reveal version; no history/receipt on denial |
| Job status / result | Own durable job plus output/parent links; opaque job ID is not authority | `jobs:read` | Read-only across pending/running/terminal states; no implicit retry/resume | Foreign job/result unavailable; no result URL or provider metadata leak, dispatch or charge |
| Cancel job | Own job; worker completion must honor adopted cancellation policy | `jobs:write` | Idempotent account-scoped cancellation request, conditional job state/version; terminal/late-completion rules need D0 | Foreign job unchanged; no cancellation signal/refund/receipt on denial; do not erase successful history |
| Select recommendation | Own batch, idea membership, profile, DNA and brief lineage | `recommendations:write` | Exact immutable batch/idea + expected selection version + request ID; no automatic generation | Foreign/mixed-parent idea unavailable; stale own selection conflicts; no selection/history/receipt or spending |
| Save script | Own script/project, selection and source lineage; reject mixed-account parents | `scripts:write` | Expected version + request ID; append full revision; exact replay returns original authorized response | Foreign ID unavailable; own stale/changed replay conflicts; no new version/receipt |
| Read script | Own script and requested version, including later-chat reopen/export | `scripts:read` | Durable exact version; read does not regenerate or start paid work | Foreign/guessed version unavailable; no script, source content or signed artifact link leaked |

D0 must decide whether these scopes are distinct or grouped. Existing
`account:read`, `projects:read`, `projects:write` remain the only implemented product
scopes; do not interpret them as permission for new D capabilities. Token issuance,
consent upgrades and insufficient-scope challenges need Integration/Auth coordination
if new scopes are adopted. No tenant configuration change is part of this PR.

## Error ordering and lifecycle proposal

Use current v1 behavior as the baseline for review:

- Missing/expired credentials, blocked mapping or issued-at cutoff: UNAUTHENTICATED
  before repository access. Mapping cutoff is not provider grant revocation.
- Valid identity without required scope: FORBIDDEN before storage, including receipt
  replays. MCP supplies an insufficient-scope challenge; website uses HTTP 403.
- Valid, sufficiently scoped identity with another account's or absent object ID:
  indistinguishable NOT_FOUND without content/current version. For v1 website APIs
  this is HTTP 400; MCP tool failures use HTTP 200 with an error result. Do not assume
  a future HTTP 404 contract or promise identical timing.
- For owned objects, stale new requests conflict; a successful exact replay returns
  the saved snapshot even after newer versions exist. Changed payload for the same
  account/request ID conflicts. A's request ID must not expose A's receipt to B.
  Existing v1 receipts are checked before object lookup; B reusing B's own completed
  request ID with different content can receive IDEMPOTENCY_CONFLICT. This does not
  reveal foreign-object existence.
- Suspension is separate from identity blocking: current v1 permits account-state
  inspection but denies project reads/writes and receipt replay. Bangkok must adopt
  D retained-read/cancel policy explicitly; commercial billing rules are not inferred.

For background execution, propose rechecking account eligibility before new paid
attempts and before publishing account-visible results, using the persisted owner
rather than provider/tool input. Whether cutoff, disconnect or suspension stops an
already accepted job, and settlement after cancellation/late completion, remain
Bangkok state-machine decisions. Credential expiry alone is not yet an adopted rule
for cancelling durable work. Jobs must not retain user refresh tokens to confer ownership.

## Local regression evidence and limits

Existing coverage reviewed: `auth-persistence.test.ts` (signed credentials + SQL
mapping, A/B isolation, cutoff/block recovery), `auth-website.test.ts` (refresh and
mock revocation), `database.test.ts` (suspension/receipt replay, version conflicts,
SQL privileges), `operations.test.ts` (scope/validation boundary).

New `tests/d-auth-receipts.test.ts` adds two cases against existing production
verifier/application APIs and actual migration SQL in disposable PGlite:

1. An exact successful receipt replay is denied after expiry, lost write scope,
   cutoff and block, without reaching project storage. Fresh authorization after
   unblock preserves cutoff and can replay the original receipt without mutation;
   the second account remains usable.
2. Foreign and absent IDs yield NOT_FOUND with stale/current/guessed versions and
   A's successful request ID. Every denial preserves complete project/history/receipt
   snapshots. Own stale/changed-replay conflicts also leave state unchanged. B can
   subsequently use both a denied request ID and A's receipt ID for B's own creation.

These are locally signed JWTs, SQL identity controls and serialized PGlite transactions.
No Auth0 issuance/revocation, hosted Supabase/PostgREST, concurrency, D operations or
ChatGPT journey is proved. No new D schemas, fake D handlers or passing placeholders.

Validation on 2026-10-09: `npm run setup` passed; focused tests passed 2/2;
`npm run check` passed 85 TypeScript tests, two browser suites, typechecking,
dry-run Worker bundle and local workerd smoke. `git diff --check` passed.
Only this document and `tests/d-auth-receipts.test.ts` belong to this increment.

Setup's npm audit reported three high-severity development dependency findings:
`wrangler` → `miniflare` → `sharp` (librsvg CVE-2026-96889). The registry suggested
Wrangler 4.149.0; this is a review input, not a verified fix in this workspace.
`npm audit --omit=dev --json` reported zero findings. Bangkok owns dependency updates;
no package/lockfile edits or automatic audit fixes were made.

## H1–H4 reconciliation and safe next hosted step

The [existing runbook](../auth-remaining-acceptance.md) and
[blank retained-result record](auth-remaining-result-template.md) remain applicable.
The [latest Stage 2 report](../stage2-verification.md) records working hosted login,
identity mapping, persistence and reported refresh continuity. Old setup blockers
are historical; the following evidence gaps are still open, not failed tests.

| Check | Still missing before execution / acceptance |
| --- | --- |
| H1 retained cross-account write rejection | User confirms fictional B availability; Bangkok approves quiet window and one denied attempt against freshly read A snapshot/version; retain actor, valid request/response, full before/after snapshot and no added receipt/history |
| H2 provider-issued limited scope | B availability and approved authorization session; evidence of actual granted scopes (not requested scopes alone), account-state success plus scope-denied read/write; any fallback app/grant configuration separately approved |
| H3 hosted cutoff/block/recovery | B availability and exact private issuer/subject mapping verified by Bangkok; guarded single-row mutation approval, old state/cutoff, unaffected A control and recovery owner; unblock without lowering cutoff |
| H4 provider grant/refresh revocation | B availability, exact website client/grant verified privately, current refresh/rotation policies and latest credential session; Bangkok-approved grant action and correlated provider failed-refresh event; fresh reauthorization recovery. ChatGPT grant needs separate approval |

**Safe next step now:** hand this PR to Bangkok for D0 review and request only a
non-secret availability/coordination record: whether fictional account B
`4dbb320b-9a7c-4d8f-85ed-75498cb577d1` is still disposable and free for a specified
window, which workstreams use it, and who will operate/recover it. Bangkok then records
per-H approval, confirms private target mappings in its approved tooling, and selects
the first H1 window. Availability confirmation alone does not authorize any mutation.
No hosted write attempt, identity mutation, grant action or live token exchange was
performed for this assignment. Do not send subjects, credentials, cookies or raw HARs.
Local logout and mocked revoke success remain insufficient proof of provider revocation.

## Bangkok handoff / dependencies

Before concrete D tests, supply merged operation inputs/outputs, scope decisions,
account-scoped parent/lineage constraints, receipt namespace/version policy, job
state/cancellation rules and fixture seams. Proposed schema needs are ownership on
profile associations/scans/DNA/jobs/batches/selections/scripts, composite ownership
constraints for links, append-only versions and scoped successful receipts. These
are review requirements, not parallel schema definitions or migration allocations.

No production files, MCP/panel files, dependencies, runtime configuration, contracts,
application logic or migrations changed. No spending, deployment or hosted account
mutation occurred. Bangkok owns review/merge and any later authorized hosted run.
