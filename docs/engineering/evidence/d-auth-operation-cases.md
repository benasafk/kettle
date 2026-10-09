# Profile/DNA authorization cases — original preparation

Nagoya review, 2026-10-09, base `4a31f3c`. Branch
`gustasbull/npm-setup-and-check-v4` was clean and already synchronized with origin/main.
**Update:** PR #20 now supplies the stored-DNA operations. See [executed signed-auth evidence](d-creator-auth-results.md) for current coverage and remaining limits. The pending statements below retain the original pre-operation review.

This refines [the D authorization matrix](d-auth-matrix.md) against merged D0
(PR #17, merge `5a4f1c1`). **All cases below are pending, not executed D acceptance.**

## Reviewed boundary and required Bangkok interfaces

`packages/contracts/creator-profile.ts` supplies `ProfileScanRequest`,
`ProfileScanResult`, `CreatorAnalysis`, `CreatorDnaSnapshot` and
`CorrectCreatorDnaInput`. The shared `creatorAnalysisFixture()` provides fresh
fictional content. `CreatorAnalysis` validates scan/profile/evidence consistency;
it has no Kettle account ownership context. Schema acceptance cannot authorize a read
or prove that a correction's target claim belongs to a persisted DNA version.

At the reviewed base, `toolContracts` and `createOperations` implement only account
state and project get/save. No profile/DNA repository RPCs or migrations exist.
No replacement handlers, fake repositories or passing placeholder tests are added.

Bangkok interface requests (proposals for the lead-owned implementation, not new schemas):

1. Export authenticated operations for owned profile/scan/DNA reads and DNA correction,
   their input/output schemas, exact error codes, and adopted required scopes. Confirm
   which read IDs are accepted and which records can be returned together. Scope names
   in the earlier matrix remain proposals; this handoff changes no OAuth settings.
2. Provide the repository composition entry point and real migration/RPC boundary used
   by those operations. Keep verified account identity separate from caller input.
   Tests will use the production JWT verifier, real SQL identity resolver and actual
   operations/repository against disposable local SQL. Fixture provider/model output
   is permitted only as stored input; authorization decisions must remain real.
3. Define the owned profile association key versus public `CreatorIdentity`; two Kettle
   accounts must be able to reference the same platform/native ID without sharing
   private scans/DNA. Supply an approved seed/persistence seam for two accounts and
   multiple owned records without live provider calls or test-only runtime endpoints.
4. Clarify DNA identity/version semantics: `CorrectCreatorDnaInput.dna_id` identifies
   existing DNA while the guide requires new snapshot IDs. Does correction target the
   displayed snapshot or a stable lineage ID? Define current-version lookup and how
   a second correction targets the lineage after version 2. Do not let tests guess.
5. Define claim membership across versions, all-or-nothing correction behavior, exact
   receipt output and request-ID namespace (account + operation or account-wide), and
   error precedence for stale version versus invalid claim membership. Adopted v1
   errors below are proposed D expectations until the operation contract confirms them.
6. Identify local read-only queries/exports for complete before/after state: ownership
   links, scan/observation rows, DNA versions/current pointers/claims, receipts and any
   job/provider-attempt/reservation records touched. Define the safe public projection;
   private cursors/cost attempts/provenance must not leak through read outputs.

## Fixture arrangement and assertion rules

Create verified fictional accounts A and B through the actual local identity resolver.
Persist A1, A2 and B1 as separate owned associations/scans/DNA lineages through Bangkok's
approved local setup seam. A1 and B1 intentionally reference the same public platform
and native creator ID/URL, with distinct stored scan/observation/DNA/claim IDs. A2 is
another lineage owned by A. Reuse the shared D0 fixture with fresh IDs and coherent
lineage; validate the complete `CreatorAnalysis` envelope before storing it. No fixture
identity bypass is shipped or used as operation authorization proof.

For each denial retain the full application result, authenticated actor alias, input,
complete before/after durable snapshots and relevant storage/dispatch call counts.
Compare canonical sorted rows, not only counts or version numbers. No successful
receipt may be created on denial. A/B successful controls prevent missing data or
unusable credentials from masquerading as isolation. Use valid typed inputs unless
specifically testing input rejection; schema failure is not ownership proof.

| Case | Action through actual operation | Required result / evidence |
| --- | --- | --- |
| DA-01 — owner control | A reads A1 scan, observations and DNA; reconnect with another valid credential for the same subject and read again | Same account and exact persisted version/lineage; no regeneration or provider attempt |
| DA-02 — account isolation | B reads A1 association/scan/DNA IDs, then random well-formed absent IDs; reverse A/B | Same sanitized NOT_FOUND for foreign and absent IDs, no private data; own B1 remains readable despite sharing the same public creator identity |
| DA-03 — foreign correction | B submits otherwise valid `CorrectCreatorDnaInput` targeting A1 DNA and its real claim; repeat with absent DNA and stale/current/guessed expected versions | NOT_FOUND without current version/claims; no pointer/version/receipt/job changes; no lookup result returned from A's receipt |
| DA-04 — mixed claim parents | A targets A1 DNA with B1 claim ID, then A2 claim ID, then a random absent claim ID | Reject every mismatch with the adopted membership error; B1 and absent claim must not reveal ownership/existence. Same-account membership must also be enforced |
| DA-05 — atomic correction | A sends one valid A1 claim correction plus one B1/A2/absent claim correction in the same request | Entire request rejected, including the valid prefix; no partial claim append/current pointer update/receipt |
| DA-06 — scope boundary | Valid A tokens individually lack each adopted read/correct scope; repeat a successful correction receipt with the write scope removed | FORBIDDEN before repository access; unchanged rows and no dispatch. Positive control with required scope succeeds; provider issuance remains a separate hosted check |
| DA-07 — stale correction | Two requests start from A1 version 1. Save R1; submit R2 with expected version 1 under the adopted DNA-ID semantics | R1 appends version 2; R2 VERSION_CONFLICT, no extra history/receipt. Fresh read remains version 2; no automatic merge/retry |
| DA-08 — correction lineage | Successfully correct A1 claim text and reopen in a fresh operation instance | New snapshot/claim IDs, `user_corrected` attribution, correct `supersedes_claim_id`, preserved source evidence and immutable prior snapshot; full envelope valid |
| DA-09 — successful receipt replay | Save R1; make another authorized correction; replay exact original R1; then change R1 payload | Exact replay returns original saved response, no append. Changed payload IDEMPOTENCY_CONFLICT; neither case overwrites latest version |
| DA-10 — receipt isolation | B submits A's exact successful correction/request ID, then uses that ID for a valid B1 correction | First denied without exposing A's response; second succeeds according to adopted account-scoped namespace. A's original replay unchanged |
| DA-11 — denial does not consume ID | A stale or mixed-parent request is denied; use its request ID for a valid fresh correction | Valid retry succeeds because no successful receipt was stored on denial; preserve original denied-request evidence |
| DA-12 — identity lifecycle | Repeat reads/corrections and successful receipt replay with expired JWT, cutoff-invalidated mapping, and blocked mapping; recover with fresh token after unblock retaining cutoff | UNAUTHENTICATED before repository; state unchanged; B control succeeds; fresh authorized A recovers same account, old token stays denied |
| DA-13 — parent graph reads | For any adopted operation accepting multiple association/scan/DNA/observation IDs, combine A1 parent with B1 and A2 children | Reject mismatched graph even when both parents belong to A; no unrelated observation returned. If no multi-ID read exists, test internal stored-link constraints through the actual persistence boundary instead |
| DA-14 — caller authority rejection | Add caller account ID, evidence/provenance or replacement ownership to otherwise valid correction input | VALIDATION_ERROR from strict input; no mutation. This is input rejection evidence, separately labelled from DA-03/04 isolation |

Exact error envelopes and transport status assertions will follow merged operation
contracts. Application cases do not prove MCP challenges or website status mapping;
Integration-owned transport tests follow registration. Concurrent stale writes require
actual multi-connection PostgreSQL/PostgREST evidence, separate from serialized PGlite.

## Implementation handoff and current evidence

Next test file: `tests/d-auth-profile-dna.test.ts`, only after real operations merge.
Import shared schemas/fixtures and actual application exports; do not redefine them.
Tests may instrument actual repository calls to count denied access, but must not
replace authorization or persistence with canned outcomes. Keep network/provider work
fixture-only and record local versus hosted evidence separately.

The existing `tests/d-auth-receipts.test.ts` remains v1 project regression coverage;
it cannot establish DA-01–14. D0 contract tests establish schema validation only.
No new scopes, tenant settings, hosted identity changes, provider calls or deployment
were made. H1–H4 remain pending under the existing runbook and coordination gate.

Executable PR gate: Bangkok merges operations/storage and resolves the six interface
requests above; Nagoya implements and runs actual cases, records exact merged base and
results, then opens a small tests/evidence PR. This preparation alone is not that PR.

Local review validation: `npx tsx --test tests/creator-profile-contracts.test.ts
 tests/d-auth-receipts.test.ts` passed 12/12 (10 existing schema tests and two existing
v1 receipt regressions). `git diff --check` passed. No D operation case was run;
no full-suite rerun was needed for this documentation-only handoff.
