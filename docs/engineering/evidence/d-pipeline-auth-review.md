# Creator pipeline authorization review

Reviewed `ea7e1b198c6377318107236956443015cb306427` (PR #27), 2026-10-09.
This is a source review and pending acceptance matrix, not executable pipeline or
hosted proof. The reviewed tree supplies contracts and provider ports but no pipeline
application/repository, durable guard or migration. Existing stored-DNA tests do not
prove this pipeline. No shared code, scopes, identities or runtime settings changed.

## Findings and confirmed Bangkok policies

The four public inputs are strict and accept no account identity or research allowance.
Start operations declare `projects:write`; job reads declare `projects:read`.
Job schemas reject premature results, mismatched result kinds and cross-project scan
results. These are useful structural checks, not ownership checks.

1. **Required contextual result validation:** `CreatorScriptSet` cannot establish that
   its batch, idea, DNA/version and variant reference IDs match the immutable selection.
   It also accepts `contains_fixture_data: false` independently of a fixture batch/DNA.
   Recommendation results cannot establish their DNA/version against the queued job;
   recommendation/script job results have no schema check against `job.project_id`.
   Before persistence, the runner/repository must compare the full result to captured
   owned inputs, enforce selected-idea reference membership, and preserve fixture
   provenance. A standalone successful schema parse is insufficient. Prefer the
   lead-owned contextual validator over duplicating public fields or schemas.
2. **Confirmed version policy:** recommendations require the latest `expected_version`.
   An explicit new script start may select an older immutable batch after a DNA
   correction. Derive and bind its original owned DNA snapshot/version; display that
   version and never substitute current DNA. Previously accepted jobs and receipts
   likewise retain their captured lineage. This resolves the earlier handoff's broad
   “stale DNA start” wording; it is not a contradiction in the shared schemas.
3. **Confirmed allowance/replay policy:** active authorized users may read existing
   jobs/results after research allowance withdrawal. Receipt replay must not create,
   resubmit or resume paid work. Every new provider attempt rechecks active account
   and server-controlled allowance, including work queued before withdrawal. Scope
   alone is insufficient. Account revocation denies reads, writes and receipt replay.
   Confirm the concrete denial codes and whether start replay returns the existing
   job or denies when allowance has been withdrawn; either outcome must have zero
   execution effects. `get_creator_job` remains the authorized read path.
4. **Internal ownership and revocation are implementation gates:** keep job, project,
   DNA, batch, idea and receipt ownership bound in SQL, not just in parsed public output.
   The runtime must validate captured batch/idea/DNA ID and version, reference subset
   and fixture flag propagation before persisting output, as Bangkok confirmed.
   Capture trusted account context for asynchronous work and perform the confirmed
   account/allowance check at every new provider attempt. A late callback cannot
   reactivate an account/identity, bypass read authorization, or grant access through
   a cached receipt. Identity cutoff and account suspension are distinct conditions;
   identity credential denial does not by itself define cancellation of queued work.

Additional bounded-input discrepancy: `ProfileScanRequest` permits 50 videos/3 pages,
while the integration brief's initial runtime limit is 10/2. The effective server cap
must reject or clamp before any dispatch/reservation, independent of schema acceptance.
This is not a proposal to change the shared profile schema or increase the limit.

## Pending operation acceptance matrix

Use fictional signed subjects A/B, with A1/A2 and B1 project/DNA lineages. A1 and B1
may reference the same public creator without sharing private resources. Create real
jobs and batches through the published operations and actual local SQL; substitute
only provider content/I/O. Never substitute the authorization/repository implementation.

| Case | Action and required evidence |
| --- | --- |
| PA-01 | For each start: valid write scope plus allowance succeeds; read-only scope with allowance denies; write scope without allowance denies. Injected account/allowance fields reject. Compare complete durable rows and dispatch counts on denial. |
| PA-02 | Read each job state using read-only scope without allowance; no provider call, dispatch, reservation, receipt or job mutation. Write-only scope denies read. Rendering/reopening is covered by the UI owner, not inferred from this operation test. |
| PA-03 | A reads B's job and starts against B's project/DNA/batch. Compare with random unknown IDs: same non-disclosing denial. B can successfully access its own resources. |
| PA-04 | Mix A1 batch with A2 idea, A batch with B idea, and unknown idea. Deny before writes/dispatch even for same-account wrong-parent IDs; valid own selection is the control. |
| PA-05 | Correct DNA, then start recommendations with old expected version. Reject without writes. Start scripts from an old-version owned batch successfully; assert original DNA snapshot/version is passed to generation, persisted and displayed. Preserve exact captured lineage for previously accepted jobs. |
| PA-06 | Exact request replay returns the defined existing job without duplicate work. Changed payload/operation under the same request ID conflicts according to the published namespace; B's reuse cannot access A's receipt. Test replay after job state advances. |
| PA-07 | Replay each successful start and read each result with expired, wrong-audience, insufficient-scope, blocked-identity and cutoff credentials; deny before durable changes/dispatch. Separately suspend the account. Fresh credentials for the same subject provide recovery controls where permitted. |
| PA-08 | Pause fake provider completion after a real accepted job; revoke identity or suspend account locally, then release completion. Reads/replays stay denied, identity/account rows stay revoked. Check the lead-defined completion/cancellation state and no further provider call after account revocation. For identity-only cutoff/block, prove credential denial and unchanged revocation rows without assuming the queued job is cancelled. |
| PA-09 | Return structurally valid but wrong DNA/version/project/batch/idea/reference lineage or false fixture provenance from the provider seam. No successful persisted/public result; only defined failure/reconciliation bookkeeping may change. |
| PA-10 | Withdraw allowance or exhaust the configured ceiling between admission and a later provider request, including queued work. Guard denies new I/O. Authorized reads remain available; start receipt replay cannot create/resubmit/resume work. Exact successful call replay, ambiguous attempts and duplicate completion follow published durable semantics without another charge or duplicate output. |

For denials compare sorted full rows across identity/account, project/DNA, jobs,
batches/scripts, receipts, attempts and reservations as applicable. Capture actual
operation results, actor aliases, inputs and dispatch/provider-call counts. Exclude
only the explicit setup mutation from each before/after comparison; expected runner
failure bookkeeping must be identified, not hidden. No secrets enter evidence.
PGlite tests will not prove multi-connection races, hosted OAuth, PostgREST or Workflows.

## Concrete seam requested

Bangkok to publish the authenticated pipeline factory/execute API, repository adapter
and migration, local fixture/provider composition, and runner advance/complete entry
point that uses the actual durable guard. Please also identify the trusted allowance
configuration, account recheck/completion boundaries, public error codes/precedence,
receipt namespace and replay output semantics, and durable tables
for snapshots. Auth will add dedicated `tests/d-creator-auth*.test.ts` coverage against
those implementations. No placeholder operations or mocked authorization tests are
introduced while these seams remain unpublished.
