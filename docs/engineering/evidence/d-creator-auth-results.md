# D1 — Signed creator authorization / local SQL evidence

Nagoya, 2026-10-09. Input main: `26aa6bc` (PR #20).
Branch: `gustasbull/npm-setup-and-check-v4`. The initially clean branch was merged
with origin/main without reset or rename, preserving acceptance-plan commit `50e63de`.
Both commits are ancestors of this delivery. No hosted migration was applied.

This supersedes the pending-operation statements in
[the acceptance cases](d-auth-operation-cases.md) for the implemented stored-DNA slice.
The broader [authorization matrix](d-auth-matrix.md) remains a proposal for future
scan jobs, recommendations and scripts; its proposed new scopes were not adopted here.

## Resolved Bangkok interfaces

PR #20 supplies `createCreatorOperations`, `createCreatorIngestion`, `creatorContracts`,
the shared view/output contracts, and migration `20261009160000_creator_dna.sql`.
Stored DNA reads require `projects:read`; corrections require `projects:write`.
No new scope or tenant setting is needed for these project-owned resources.

`dna_id` is the stable association ID; immutable `snapshot_id` and corrected claim IDs
change with each version. Corrections target current claim membership. SQL resolves
account status, account-scoped receipt, owned association, expected version, then claim
membership. Thus a stale new request conflicts before evaluating its old claim IDs.
Invalid claim membership returns VALIDATION_ERROR; foreign/missing DNA returns NOT_FOUND.
Creator ingestion/corrections share an account/request-ID namespace separate from v1
project receipts. Exact authorized replay returns its original result.

## Executed tests and what is real

`tests/d-creator-auth.test.ts` uses locally generated RS256 credentials, the production
`createJwtVerifier`, and the real SQL `kettle_resolve_identity` on every verification.
There is no mock verifier or canned authorization result. New A/B identities are
provisioned by SQL; projects are created through the existing authenticated operation.
Shared authored analysis fixtures get fresh coherent IDs and enter through the trusted
server ingestion seam. Every association intentionally references the same public
creator, proving public identity does not confer private Kettle ownership.

Creator operations invoke the actual migration RPCs in service-role transactions in
PGlite through a test SQL transport. This is not the HTTPS PostgREST adapter or hosted
Supabase. The transport counts calls but does not substitute SQL results. Durable
comparisons include full rows from projects, brief versions, project receipts, creator
profiles, scans, DNA versions and creator receipts, sorted deterministically. Identity
control rows are excluded from those snapshots because the lifecycle test deliberately
changes only their cutoff/block values in the disposable database.

| New case | Verified locally | Acceptance-case mapping |
| --- | --- | --- |
| Signed reads/receipt lifecycle | Separately missing read/write scope denies before creator storage; positive controls work with each adopted scope. Expired/wrong-audience JWTs and exact-issued-at cutoff deny current/historical reads and original successful receipt replay. Block denies existing and newer tokens. B remains usable. Unblock retaining cutoff rejects old tokens; a new credential from a different client claim resolves the same A account and replays without mutation. | DA-06, DA-12; signed credential portion of DA-01 |
| Same public creator, private accounts | A/B current, historical and absent-version reads for foreign/absent IDs have identical NOT_FOUND envelopes. B cannot replay A's successful correction even with guessed expected versions; complete rows stay unchanged. B then uses the same request ID for B's own correction successfully. Fresh operation instances read each owner's current and historical snapshots independently. | DA-02, DA-03, DA-10; current/historical portion of DA-01 |
| Mixed batches and correction recovery | Valid A1 claim plus A2/B1/absent claim rejects the entire batch without any row change or receipt. The same request ID then succeeds for a valid A1 correction. A stale request conflicts; current version with a superseded claim is invalid; both leave complete rows unchanged and the ID reusable for a reconciled correction. Exact old receipt replay and changed-payload conflict preserve the latest state. | DA-04, DA-05, DA-07, DA-09, DA-11 |

This extends rather than replaces `tests/creator-persistence.test.ts`, which already
covers basic read/correct/history, claim attribution/evidence lineage (DA-08), projection,
suspension, SQL privileges/foreign keys, ingest/correction receipt collisions, input
rejection (DA-14), and receipt-insert rollback. New coverage targets signed verification,
whole-state invariants and combinations not established by its fixture verifier.

DA-13's multi-ID public read does not exist: `get_creator_dna` accepts one stable DNA
ID and optional version. Composite ownership SQL constraints are tested in the existing
persistence suite; mixed-analysis claim membership is exercised by the new signed tests.
No substitute scan/observation read API or artificial passing test was invented.

## Limits and pending acceptance

- JWTs are locally signed; the cutoff/block is Kettle's mapping control, **not Auth0
  provider grant/refresh-token revocation**. H1–H4 hosted checks remain pending under
  the [existing runbook](../auth-remaining-acceptance.md), including account B availability
  and separately coordinated approvals. Local logout is not provider revocation proof.
- Direct operation tests do not exercise website cookies, MCP challenges/registration,
  ChatGPT interaction or reconnect UX. A different `azp` claim is not a hosted OAuth flow.
- PGlite serializes transactions. No multi-connection concurrency, deployed migration,
  network PostgREST or remote Worker restart evidence is claimed.
- No provider fetching, paid start, job dispatch/cancel, reservations or recommendation/
  script operations exist in this tested slice. Their authorization remains pending.
- Server-only ingestion is used for fictional setup, not exposed as a client endpoint.
  No scopes, tenant settings, hosted identities, shared schemas or production code changed.

## Validation

Focused `npx tsx --test tests/d-creator-auth.test.ts`: **3/3 passed**.
`npm run check` passed **115 TypeScript tests and two browser suites**, typechecking,
dry-run Worker bundle and local workerd smoke. `git diff --check` passed.
This PR is tests/evidence only;
Bangkok owns review, merge and any separately authorized migration/deployment.
