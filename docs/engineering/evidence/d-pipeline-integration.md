# Creator pipeline integration plan — 2026-10-09

Berlin owns the controller, host bridge and dedicated tests. Read the proposed shared
baseline at `ea7e1b198c6377318107236956443015cb306427` in PR #27 without merging its
unapproved branch. Existing branch safely fast-forwarded to merged main `5bae1e5`.
Dependent implementation begins after the shared contracts merge to main and are
incorporated. No copied schemas or temporary production components.

## Proposed lifecycle

Consume `GetCreatorJobInput`, `CreatorJobOutput` and `CreatorJobView` from the shared
contract module. Accept only validated `structuredContent`; text and private metadata
are never alternate sources of job data. Complete text fallback serializes the entire
validated public output, including messages, limitations, references and script fields.

Require a matching selection and completed parent-host handshake before display or
reads. Retain immutable job identity, project, kind and creation timestamp for a selection.
Reject mismatched identity and lower revisions; equal revisions may repeat the identical
snapshot but must not replace it with contradictory data. Changing job ID aborts the
previous request and resets the revision domain. Do not infer intermediate job states.

Refresh invokes only `get_creator_job({job_id})`. Render/reopen never invokes a start,
research or generation operation. Bounded polling is permitted only for authoritative
`queued`/`running` snapshots while the host advertises read capability. Proposed defaults:
2-second interval after a settled read, one request at a time, 10-second request deadline,
at most 30 automatic reads and at most 60 seconds per mounted selection. A terminal
`succeeded`, `failed` or `needs_reconciliation` snapshot stops polling immediately.
Duplicate refresh requests coalesce; manual refresh does not reset the automatic budget.
Pause automatic polling on timeout/transient failure; explicit refresh can recover.
Teardown, selection change and auth loss abort requests and invalidate late completions.
A remount creates a fresh bounded observation window and still only reads persisted jobs.

No server-tools capability means display the received snapshot with no polling or reads.
Auth denial, malformed output, mismatched identity and transport loss clear private UI.
A transport error is not classified as a new job failure. Poll-budget exhaustion is a
presentation notice, not a job state. Recovery requires explicit refresh or reopening.
No state is persisted in browser storage and no credentials are passed to the component.

## UI coordination

Consume Shanghai's exact `apps/panel/creator-pipeline/index.ts` export:
`mountCreatorPipeline(root) => { render(job: CreatorJobView), dispose() }`.
Do not implement a competing job card. Requested clarification: an owned UI seam for
initial loading, cleared auth/error presentation and timeout/poll-budget notices, which
cannot be represented by a fabricated CreatorJobView. If the minimal export remains,
Berlin can dispose the card on denial and leave recovery to chat; agree on presentation
before wiring. Current assignment uses chat instructions for selection/generation;
refresh/reopen must never become a paid action. Fixtures come only from the shared
`evals/creator-loop/pipeline-fixtures.ts` module.

## Proposed lead wiring

- Entry: `apps/panel/creator-pipeline-bridge.ts`, mounting `#root`.
- Generated artifact: `apps/panel/generated/creator-pipeline-bundle.ts`, string export
  `creatorPipelineScript`; lead-owned build hook validates the real component import.
- Dedicated Integration resource: `apps/worker/creator-pipeline-resource.ts`, exporting
  `registerCreatorPipelineResource`, URI `ui://kettle/creator-pipeline-v1.html`, MIME
  `text/html;profile=mcp-app`. Static script escaping, inline-only display and empty
  connect/resource/frame/base-URI CSP follow existing cards; no provider data in HTML.
- Lead-owned `render_creator_job` aliases authenticated `get_creator_job` with exact
  `GetCreatorJobInput` and `CreatorJobOutput`; requires projects:read. Preserve challenges,
  ownership verification, complete text fallback, list/registration metadata agreement
  and existing SDK output-schema workaround. Neither alias nor resource starts a job.
- Existing project/DNA resources, entry points and behaviors remain unchanged. No
  dependency, shared contract, application, worker registration or build edits by Berlin.

## Planned executable evidence

Controller tests use shared fixtures for all three job kinds and contract states:
wrong ID/project/kind, lower/equal/new revision, selection switch, duplicate reads,
request ordering, auth clearing, missing host capabilities, terminal polling stop,
finite polling limits, timeout recovery and late results after disposal. A test clock
or short configured timers exercises limits without real waits or provider calls.

Browser tests bundle the real component and bridge with installed ext-apps/SDK, use a
local parent-frame fixture, and verify source filtering, result validation, only read
calls, all terminal outcomes, bounded reads, explicit recovery, theme/resize and teardown.
Resource tests verify list/read metadata, one static bundle, restrictive CSP and escaping.
No fixture enters the production entry. Run focused tests and repository checks after
lead build prerequisites exist; distinguish one-off local bundle proof from clean-build
proof if lead hooks are pending.

Later lead integration proves application authorization, cross-account job denial,
Worker routing and registration. Actual ChatGPT rendering, cross-chat reopen and the
full live TikTok journey require separate host/provider authorization and evidence.
This plan performs no live provider calls, spending, deployment or hosted mutations.

## Executable controller slice — merged baseline d8b7b5d

Safely merged `origin/main` at `d8b7b5d4c0cfc7ed67f2636c660fda2691357053`, preserving
the branch, prior integration commits and plan commit `0958d46`. The controller now
imports the real merged contracts and tests use `creatorJobFixture` for public outputs.
No shared files were changed.

`apps/panel/creator-pipeline-controller.ts` exports `createCreatorPipelineController`,
`creatorJobStructuredOutput` and `creatorJobText`. Its presentation observer has loading,
job and cleared callbacks; these are host lifecycle callbacks, not duplicate job schemas.
The injected read accepts only the inferred `GetCreatorJobInput` and an AbortSignal.
The future bridge must supply only `app.callServerTool({name:'get_creator_job',arguments})`
and pass the validated structured public output to the controller.

Implemented defaults match the proposal: 2-second polling after settlement, at most one
read in flight, 10-second request deadline, 30 automatic requests or a 60-second window
per selection. These are independent client observation bounds, not provider job limits.
The window prevents new automatic requests; a read already in flight remains bounded by
its own timeout. Explicit refresh remains possible without resetting the automatic budget.
All three contract terminal states stop polling. Duplicate identical revisions are valid;
conflicting equal revisions and terminal-to-active regression fail closed. Lower revisions
are ignored with a notice and automatic polling pauses. No start/generate API is exposed.

Validation: `npm run typecheck` passed both projects; `npm test` passed all 180 tests,
including 22 new controller tests using a fake clock. Dedicated tests cover matching
selection/handshake, absent read capability, finite count/time budgets, duplicate reads,
all terminal states, ID/project/kind/creation-time mismatch, old/conflicting revisions,
selection changes, auth/not-found clearing, timeouts/retry, transport failures, teardown,
invalid inputs/envelopes and full text for DNA, recommendations and scripts. No browser
or hosted pipeline proof is claimed in this controller-only increment.

Shanghai confirmed on PR #27 that initial loading and auth clearing belong to the host
(dispose/remount); the component remains `render(job)`/`dispose()`. No real component
source was available on merged main at this slice, so bridge auto-mount and browser tests
remain pending that component, rather than shipping a stub or unresolved import. Resource
and generated artifact names above remain proposals awaiting lead build coordination.
Runtime/job orchestration, permission-safe application reads, worker registration and
provider execution remain lead-owned and pending. No deployment/provider calls/spend.
