# D0 integration preparation — Berlin

2026-10-09. Review proposal for Bangkok and Shanghai; no D tools, schemas or UI
exports are implemented or frozen by this document. Input/base: `706002f` (kickoff).
Branch inspected: `gustasbull/chatgpt-mcp-v1`; clean before fast-forward from
`4790956`. No reset, rename, discarded edits or copied workspace credentials.
The PR head is recorded in the PR handoff rather than a self-referential commit ID.

## Saved-view component wiring on canonical UI baseline — 2026-10-09

Merged canonical `86f8327840a883347ddb8d00170d2bffb3d5de44` into the unchanged
`gustasbull/chatgpt-mcp-v2` branch, preserving `93ce207` and `dafb039`. The previous
UI gate below is resolved. Production host delivery remains unwired.

`apps/panel/creator-review.ts` exports `mountSavedCreatorReview(root, readDna,
timeoutMs?)`. It consumes Shanghai's exact `mountCreatorReview` export and renders
only `loading`, `error`, or `{kind:'saved',dna,preview:false}`. Fictional evidence
still forces the component's preview banner/inert links. No internal scan/analysis
states or local component implementation are used.

The adapter returns `receiveInput`, `receiveResult`, `connected`, `refresh`,
`connectionFailed`, and `dispose`. Future host composition must pass parsed tool
arguments to `receiveInput`, authenticated **operation output** (the structured
content, not the MCP envelope) to `receiveResult`, and a callback that invokes only
`get_creator_dna`. Account/connection changes require disposal and a fresh mount.
Neither this adapter nor the controller automatically mounts or executes a read.

The merged UI has no action callbacks or refreshing/warning props. Therefore refresh
is an explicit adapter method, not a new UI button. Saved content remains readable
without host read capability. A stale-response/timeout warning uses the supported
error/reopen view instead of silently presenting stale content; explicit retry through
the adapter can restore the saved view. Shanghai owns any later refresh controls or
stale-data presentation change. No UI file was edited here.

New `tests/panel/creator-review-integration.test.mjs` bundles the actual adapter and
component with a test-only public fixture entry using existing esbuild. Chromium
checks initial render without duplicate reads, explicit single-flight refresh and
focus/disclosure retention, auth clearing with late completion, timeout/retry, missing
host capability, wrong-ID rejection, and disposal. The loopback page's CSP blocks
network connections and remote assets; no unexpected requests or browser errors.
It is a local component integration test, not an MCP host, Worker resource or ChatGPT
rendering test. No provider output or real account data is used.

Integration sequence for Bangkok after this PR:

1. Review the proposed bundle/resource names in the prior handoff. Lead supplies
   approved build entry and authenticated `createCreatorOperations` composition.
2. A subsequent Berlin PR may bind the MCP Apps transport, resource and read-only
   tool after the composition lands. Preserve the existing shared descriptor/schema
   workaround and text fallback using `creatorDnaText` over the public output.
3. Run real resource/transport/auth isolation tests, then separately authorized
   ChatGPT acceptance. This PR does not register tools or implement that bridge.

Validation: dedicated Chromium adapter suite passed 6/6 checks (parent plus five
cases). `npm run check` passed: both TypeScript projects, 148 TypeScript tests,
dry-run Worker bundle, local workerd smoke, and 15 browser checks.
`git diff --check` passed. These are local/fixture results, not hosted evidence.
No mutations, scans/jobs, provider calls, dependencies, shared configuration, auth
composition or deployment changed. Existing project-review code is untouched.

## Executable read controller on PR #20 baseline — 2026-10-09

Merged `origin/main` at `26aa6bc` into the existing `gustasbull/chatgpt-mcp-v2`
branch, retaining `93ce207` and all history. Working tree was clean before the merge.
The earlier missing-operation statements below are historical: PR #20 now provides
`createCreatorOperations`, `creatorContracts`, `GetCreatorDnaInput/Output` and the
permission-filtered `CreatorDnaView`. No shared file was edited by Berlin.

Implemented `apps/panel/creator-review-controller.ts` and focused tests under
`tests/panel/creator-review-controller.test.ts`. Controller accepts operation results
and a read callback only. It imports public schemas directly, validates selection and
result IDs, binds project/profile/scan identity, compares versions within a stable
`dna_id`, and preserves explicitly requested historical versions. `snapshot_id`
changes with corrections; scans/association identity do not. No job state is inferred.

Refresh is explicit, single-flight and bounded to ten seconds. A new selection/result,
auth failure or disposal invalidates pending reads. Old/lower results cannot overwrite
a newer view; changing to an explicit historical selection resets its version domain.
Auth, malformed output and unclassified host errors clear private data and require
remount/reopen. A transient refresh failure may retain a labelled previous view.
A tools-unavailable host retains valid content with refresh unavailable.

`creatorDnaText` serializes the complete validated public operation result, including
failures, unknown metrics, limitations and withheld-claim counts. Extra internal
fields fail validation. It is not yet wired to MCP. Only the public fixture factory
from `evals/creator-loop/dna-view-fixtures.ts` is used by the new tests; no internal
stored/ingestion payload is imported into runtime/controller code.

The observer callbacks describe lifecycle events, not a duplicate UI state union or
business schema. The later adapter will map them to Shanghai's exact component state.
No component import, resource, tool registration, mutation callback, timer polling,
provider call, credential persistence or Worker auth composition has been added.

Bundle proposal sent to [Bangkok on PR #20](https://github.com/gustasbull/kettle/pull/20#issuecomment-6082094888):
entry `apps/panel/creator-review-bridge.ts`, artifact
`apps/panel/generated/creator-review-bundle.ts`, export `creatorReviewScript`, resource
module `apps/worker/creator-review-resource.ts`, URI `ui://kettle/creator-review-v1.html`.
These names remain proposals; Bangkok owns build/runtime composition. The existing
project-review entry/resource are unchanged.

UI #19 is still open at `be5689c` at this checkpoint. Bangkok's announced saved-view
export (`mountCreatorReview.render({kind:"saved",dna:CreatorDnaView,preview:false})`)
will be consumed after its merge and exact API inspection, not copied from an
unapproved branch. First implementation PR will open once that export lands.

Validation: panel build passed (534861 bytes); browser TypeScript project passed.
`npx --no-install tsx --test tests/panel/creator-review-controller.test.ts tests/project-review-bridge.test.ts tests/project-review-mcp.test.ts`
passed 46/46 tests (21 new controller/text cases and 25 existing project-review cases).
`git diff --check` passed. No actual ChatGPT, hosted permissions,
provider or paid-job proof is claimed. Existing lead tests establish application
filtering/persistence independently; controller fixtures prove only client lifecycle.

## Read-only scan/DNA slice after merged D0 — 2026-10-09

Follow-up baseline: `4a31f3c`. Current branch `gustasbull/chatgpt-mcp-v2` was
already synchronized and clean; no rename/reset/stash was performed. Shared D0
contracts landed through PR #17 (`3fccb85`, follow-up `4dc22c6`); Shanghai's inventory
landed through PR #16. The original proposal below remains future planning. This
section narrows the next executable slice and takes precedence for its scope.

### What is available, and what is not

Import from `packages/contracts/creator-profile.ts`; fictional inputs come from
`packages/contracts/fixtures/creator-profile.ts`. No copied business schemas.

| Merged definition | Integration implication |
| --- | --- |
| `ProfileScanResult` | Result statuses are exactly complete, partial, unavailable, failed. These are not job lifecycle states. It has an ID and creation time but no version/status revision; do not compare timestamps as versions or invent queued/running states. |
| `CreatorDnaSnapshot` | Positive version is scoped to DNA ID. Validate profile identity as platform + native ID and bind `source_scan_id`; handle/URL does not establish identity or ownership. |
| `CreatorAnalysis` | Validates scan/profile/DNA/evidence lineage and analysis permissions. Snapshot-only validation is insufficient at the internal analysis boundary. |
| `CorrectCreatorDnaInput` | Exists as an internal correction contract; does not authorize a public tool, application operation or correction control. Excluded from this read-only slice. |
| Fixture functions | `creatorAnalysisFixture`, `partialScanFixture`, `unavailableScanFixture` provide internal fictional data; they do not represent authorized public outputs. |

**Still missing:** authenticated application read operations, their input/output
schemas and adopted scopes, permission-safe output projection, and exact Shanghai
component exports. `packages/application/operations.ts` still executes only the
existing `toolContracts`. No creator-loop component directory/export exists on this
baseline. Therefore no production controller can yet bind the intended interfaces.

`CreatorAnalysis` is explicitly internal: analysis can use evidence without display
permission, and raw scans carry cost attempts, pagination cursors and provenance.
A schema-valid internal analysis must not be assumed safe for either UI or model-visible
text. Bangkok owns projection/redaction and cross-account enforcement; Berlin will
validate the resulting shared output rather than implement a local allowlist or cast
internal analysis into a public response. How redacted evidence affects claim lineage
must be specified in that output contract.

### Controller and test structure ready for interface implementation

Proposed owned files (not created as empty/throwaway placeholders):

- `apps/panel/creator-review-controller.ts`: host-independent read lifecycle using
  imported operation outputs and Shanghai presentation types. No UI component,
  business schema, job state machine, transport, mutation callback or polling.
- `tests/panel/creator-review-controller.test.ts`: deferred-read/fake-time tests,
  already covered by the existing browser TypeScript project and test discovery.
- Later dedicated bridge/resource/MCP tests follow only after Bangkok approves
  wiring and resource build entries. The controller itself must not be imported by
  the current project-review entry until its own integration is ready.

Controller dependencies will be authenticated read callbacks supplied by the bridge,
Shanghai's render callback, and a bounded read deadline. Exact TypeScript signatures
wait for the imported output and component types. Public methods will receive a
validated selection/result, report host read capability/connection failure, request
explicit refresh, and dispose. Method spelling is not an agreed export yet.

Behavior/test pairs to implement in that file:

| Test group | Controller rule / observable assertion |
| --- | --- |
| Launch and capability | Validate operation envelope before render; launching result causes zero duplicate reads. Missing serverTools preserves already authorized readable content and exposes chat fallback/disabled refresh through Shanghai's availability field. |
| ID/source lineage | Reject response for another selected scan/DNA ID, profile platform/native ID or source scan. Validate with merged public output schema; raw analysis is never used as a shortcut around permission projection. |
| DNA ordering | Track high-water version per DNA ID within current view epoch; accept equal/newer, ignore lower. Switching DNA IDs invalidates pending work and resets that entity's comparison context. Conflicting equal-version payload handling needs the immutable snapshot guarantee from Bangkok. |
| Scan ordering | Correlate reads to selected scan ID and local request epoch. No synthetic scan version or ordering of result statuses. Bangkok must confirm immutable scan results or provide an authoritative ordering mechanism before mutable scan refresh is supported. |
| Refresh | One explicit read at a time; duplicate clicks cause one call. A 10-second proposed deadline aborts waiting; a transport ignoring abort still cannot publish late output. Refresh/reopen invoke no start, correction, dispatch or provider calls. |
| Invalidation | New selection/result, auth/connection failure and disposal invalidate in-flight responses. Late success after auth clearing cannot restore content. Page source filtering belongs to subsequent real transport tests, not a fake controller security claim. |
| Auth/error clearing | UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, invalid envelope and unknown host rejection clear private snapshots. Recognized transient read timeout may retain the last authorized result with warning and explicit retry. Do not infer D error envelopes from v1 until adopted. |
| Partial/unavailable | Preserve exact scan status, unknown metrics, coverage and limitations. Do not derive DNA from partial data client-side or turn unavailable into an empty successful DNA result. |
| Text parity | Test the complete permission-safe public result through the eventual MCP text serializer; include IDs/versions needed for reopen, claims/evidence permitted for display and limitations. No separate provider-to-text projection or raw JSON of internal analysis. |
| Disposal | Cancel deadlines/requests, ignore late results, emit no further render/read. Component and host teardown remain their respective owners' responsibility. |

Fixtures for these tests will reuse the merged internal fixture factories through
Bangkok's fixture/projection seam, or use his public fixture exports when available.
No locally invented success/error envelope or permissive fake operation is introduced.
Application integration must separately prove zero writes/dispatch/provider calls on
reads and account A/B isolation; a controller mock cannot prove those properties.

### Coordination sent and first executable PR gate

Requests sent to [Bangkok on PR #17](https://github.com/gustasbull/kettle/pull/17#issuecomment-6081816063)
and [Shanghai on PR #16](https://github.com/gustasbull/kettle/pull/16#issuecomment-6081816590).
These are pending requests, not approvals or received interfaces.

Bangkok: provide operation/export commit, scopes, display projection, scan immutability,
DNA latest/exact-version semantics, whether DNA ID denotes stable lineage or an
immutable snapshot, and permitted-evidence lineage. Version comparison across
corrections must follow that adopted identity rule, not assume unchanged IDs. Shanghai: provide
exact scan/DNA module/export names, render/dispose types and `onRefresh` signature,
including action availability and private-content clearing. Read-only components
need no mutation, start, cancellation or generation callbacks in this increment.

When both seams are available, implement the controller and focused tests in a small
PR; public registration still waits for merged authenticated operations and safe
outputs. No dependency/build changes, current project-review edits or deployment
are needed for this preparation.

Follow-up validation: `npm run build:panel` passed (534861 bytes). Running
`npx --no-install tsx --test tests/creator-profile-contracts.test.ts tests/project-review-bridge.test.ts tests/project-review-mcp.test.ts`
passed 35/35 existing tests: ten D0 contract checks and 25 project-review checks.
`git diff --check` passed. These establish the existing local contract/regression
baseline, not a new D controller, authenticated D operation, or actual host proof.
Only this plan changed. The executable PR waits for the two interface commits;
no placeholder implementation or passing mock of a missing operation is shipped.

## Operation and metadata proposal

Names below are discussion labels, not registrations. Bangkok owns final names,
inputs/outputs, error semantics, scopes and annotations in merged D0 contracts.
All private reads and writes resolve identity from verified OAuth on every call;
public profile URLs, tool arguments, browser state and model text confer no ownership.
Website credentials remain separate from the ChatGPT bearer transport.

| Proposed operation | Effect and authoritative return | Metadata direction / gate |
| --- | --- | --- |
| `start_profile_scan` | Explicit user request saves durable job intent for an associated profile; may spend after server authorization | Read-only false; open-world true when external research is possible; idempotency only after account-scoped receipt guarantee |
| `get_creator_job` | Read saved job status and permitted result references by job ID | Read-only true, idempotent true, destructive false, open-world false; never dispatch/retry/enrich |
| `get_creator_dna` / `show_creator_dna` | Read saved DNA by stable ID; show is a render alias of the same operation | Same read annotations; show alone links a resource |
| `correct_creator_dna` | Append corrected DNA with expected version and request ID; return saved version | Read-only false; bounded account write, no generation; idempotency subject to receipt contract |
| `start_recommendations` | Explicit research request binds exact profile/DNA/brief versions to new job | Read-only false; open-world true if research; never invoked by refresh |
| `get_recommendations` / `show_recommendations` | Read immutable batch and evidence lineage, including partial or empty output | Read annotations; no fetching of expired references as a read side effect |
| `select_recommendation` | Persist selection of exact idea in exact batch with concurrency protection | Read-only false; open-world false; return saved selection, not optimistic browser state |
| `generate_script_variants` | Explicit generation request bound to saved selection and input versions; may spend | Read-only false; external-provider behavior determines open-world annotation; receipt and ambiguous-timeout recovery required |
| `save_script_revision` | Append a revision or save an existing candidate under the adopted D0 semantics | Read-only false; open-world false; expected version/request ID; save must not regenerate |
| `get_script` / `show_script` | Reopen saved script/version by ID, including in a later chat | Read annotations; reads cannot create variants or silently save candidates |
| `cancel_creator_job` (if adopted) | Request durable cancellation; report authoritative outcome | Write; distinct from stopping card polling; do not promise reversal/refund of completed external work |

For writes, destructive hints require Bangkok's review of actual irreversible
side effects (including external submissions); do not copy the project-review
read annotations. Descriptions must say which action may spend, what it saves,
and how to retrieve an existing result. An annotation is not authorization or
confirmation. No new scope strings are invented here; Nagoya reviews the D0
read/write/generation scope matrix with Bangkok before registration.

Keep one descriptor source for registration and `tools/list`, security metadata
mirrors, existing OAuth challenges and complete model-visible text fallback.
Retain the current SDK success-output registration workaround and advertised full
result union until a separately tested shared SDK change is approved. Do not send
credentials, account IDs, provider payloads or internal billing logs to a card.

## Bridge lifecycle proposal

Presentation states, not business schemas: connecting, loading saved state,
ready, observing job, submitting action, recovering uncertain action, partial,
empty, conflict, unavailable, reauthorization required, and disposed. UI state
must carry D0 types by import once merged. Do not create parallel Zod definitions.

1. Initialize through the existing source-filtered MCP Apps transport. Validate
   every tool input/result against the eventual shared schema. Source filtering
   rejects sibling-frame messages; it does not establish account authorization.
   Reject invalid envelopes, mismatched entity/job IDs and incompatible versions.
2. Render the launching authoritative result without repeating its action. A
   host-delivered snapshot must be a validated saved operation result, not a
   caller-supplied DNA/script object. Reading a durable ID resolves later chats;
   local storage and old conversation text are not the system of record.
3. Track a local view epoch, selected entity/job identity and one in-flight read.
   Match responses to the request that initiated them. Abort/invalidate requests
   on navigation, new host input, account/connection failure and teardown. A late
   completion from an old epoch cannot restore cleared data or another selection.
4. Compare versions only within their D0-defined entity/version domain. DNA,
   batch, job status and script revision counters are not interchangeable. Lower
   versions cannot replace newer state; equal versions are safe to redisplay.
   Job progression needs a server revision/ordering guarantee: client timestamps
   or invented numeric ordering of queued/running/terminal states are inadequate.
5. Refresh/reopen call only reads. Proposed active-job observation: one status
   request at a time, 10-second request deadline, intervals of 2/4/8/10 seconds
   capped thereafter, maximum 12 automatic reads per visible observation session.
   Stop at terminal status, error, hidden page, exhausted bound or disposal. Manual
   Refresh checks status once; Resume observation explicitly starts another bounded
   session. Never automatically resume on focus or start a replacement job. These
   are review defaults, not an approved polling SLA or SDK background-task feature.
6. Disable duplicate action clicks while pending. Each intentional write gets a
   request ID; uncertain retries reuse it and identical arguments. Server receipts
   must enforce this across tabs/chats. If start acknowledgement is lost before a
   job ID arrives, recover by account-scoped request receipt lookup (D0 need below).
   Do not invent a new request ID or blindly replay a paid action. Local abort
   cancels waiting, not remote work; show uncertainty until the server resolves it.
7. On conflict, preserve the user's unsaved correction for deliberate reconciliation
   while showing the current saved version; do not auto-merge or auto-submit. A
   saved selection must match the batch/idea and input lineage returned by server.
   Changing DNA/brief must not silently reinterpret an older batch or script.
8. Auth denial or unclassifiable host failure clears private snapshots, unsaved
   content and pending requests. Reauthorization/reopen is required. A recognized
   transient read timeout may retain the last saved snapshot with a dated warning.
   No claim of immediate global revocation while a card is idle/offline is made.
9. Partial results retain coverage/limitations, missing evidence and unknown metrics.
   Empty is a truthful successful outcome, not a reason to start more research.
   Failed/cancelled jobs can expose only server-approved durable partial results;
   late completions must obey the lead's cancellation/state-machine policy.
10. Teardown acknowledges the host, aborts requests and timers, stops observers,
    disposes the component and closes transport. No resize work after close.

## Shanghai seam request (awaiting agreement)

Use the established mount/render/dispose pattern for new components under
`apps/panel/creator-loop/`; Shanghai chooses and documents exact exports. Berlin
will consume those exports, not implement a competing view. This is an outbound
proposal, not a claimed Shanghai agreement.

Requested presentation inputs: validated saved D0 entities and lineage; visible
loading/action/error state; read freshness; partial coverage; observed/inferred/
user-corrected claim labels; pending vs saved selection/revision; conflict details;
capability-derived action availability; recoverable warning and recovery action.
Callbacks express intent only: refresh, resume/stop observation, submit correction,
select, generate, save, and request cancellation if approved. The bridge owns
operation mapping, correlation and request IDs; server owns authorization and
receipts. Components must not fetch providers, hold tokens or mint business records.

Selection callbacks carry stable IDs, not array positions. Correction/save callbacks
carry edited fields plus the displayed base version; shared contracts validate them.
No automatic chat message on selection. The saved operation result/text must make
selection available to the model; any additional model-context update requires an
explicit, reviewed bridge design and installed API check.

Keep accessible pending/conflict/recovery states, keyboard focus, narrow/light/dark,
long untrusted text and safe source links in Shanghai's acceptance inventory. Initial
proof shows up to three recommendations; do not pad partial batches to eight.

## Future resource/build integration

Propose separate versioned DNA, recommendation and script resources; exact URIs and
export names await the UI seam. Reuse static bundled HTML, system fonts and the host
bridge. Start with empty network/asset CSP allowlists; source links need no provider
fetch in the card. Any remote media/domain or build-entry expansion goes to Bangkok.
No SDK/dependency/config changes are requested for this preparation PR. The current
single project-review bundle cannot be assumed to emit additional resources; Bangkok
must approve and implement any multi-entry artifact map before D resource wiring.
Preserve `ui://kettle/project-review-v1.html` and existing tools unchanged.

## Executable test plan after D0

Each case is planned, not a claim of D implementation. Use merged fictional fixtures,
fake timers and controlled promise resolution; provider-call/dispatch counters must
stay zero on status/refresh/reopen. Server tests use actual shared operations, not a
mock that merely asserts its own response shape.

| ID | Scenario and assertions | Proof owner/layer |
| --- | --- | --- |
| D-I01 | Registration/list schema, scope, annotations and resource metadata agree; no-auth server diagnostic only; text-only response contains complete authorized result and limitations | Berlin MCP + Nagoya auth |
| D-I02 | Forged sibling source, malformed envelope, wrong ID/job, lower revision and response after entity switch cannot alter view | Berlin controller + real browser transport |
| D-I03 | Double click => one client submission; same request replay and concurrent tabs => one saved intent/receipt; changed payload with same ID rejected | Berlin bridge; Bangkok operation/storage |
| D-I04 | Status/refresh/reopen, timeout retry and later-chat reads produce zero new jobs/provider calls/reservations | Berlin transport + Bangkok instrumented operation integration |
| D-I05 | Out-of-order status/result, older DNA/script response and cancelled-job late completion obey authoritative version/state rules | Berlin + Bangkok |
| D-I06 | Poll limits/deadline/one-in-flight, hide/stop/dispose, explicit resume; transport ignoring abort still cannot update old view | Berlin fake-time + browser |
| D-I07 | Lost write/start response before job ID resolves through receipt recovery; ambiguous paid timeout remains uncertain without replacement job | Bangkok recovery operation + Berlin |
| D-I08 | Expired/missing token, insufficient scope, suspended account and account B reading A's IDs clear private UI; unknown vs foreign IDs indistinguishable | Nagoya server auth + Berlin clearing |
| D-I09 | Stale correction/save and simultaneous selection yield conflict; edits are not silently lost; successful versions survive reload/later read | Bangkok storage + Shanghai UI + Berlin |
| D-I10 | Partial/private/missing profile, unknown metrics, no matches, unavailable media, rate limit, budget exhaustion and malformed/injected content remain truthful, inert and recoverable | Generation fixtures + UI + Berlin |
| D-I11 | Workerd serves real generated resources with MIME/CSP and no secrets or account data; text fallback remains complete when UI/host capabilities unavailable | Berlin runtime |
| D-I12 | Fixture journey start → status → DNA correction → recommendations → selection → variants → save → reopen retains exact saved IDs/versions/evidence | Combined local integration; separately hosted |
| D-I13 | Existing project-review refresh, auth challenge, output-schema workaround, resource and teardown regressions continue passing | Berlin existing suites |

## Actual ChatGPT acceptance procedure (not executed)

Prerequisites: merged D0 operations and UI, Bangkok-reviewed integration/deployment,
explicit hosted test authorization and approved test identities. Paid path additionally
requires the lead's profile/use basis, provider access, bounded limits and allocated
budget. A fixture-hosted journey must be labelled fixture-hosted, not live research.

1. Record deployed commit, resource versions, host/device and time; refresh tool
   discovery. Check tool metadata and render a saved object with no paid operation.
2. Start the explicitly authorized scan once. Record durable job ID, server receipt
   and dispatch/call counts using sanitized server evidence. Refresh repeatedly,
   interrupt the chat and reopen; job/call counts must not increase from reads.
3. Review partial coverage and dated evidence; correct DNA and reopen saved version.
   Attempt a stale correction from an older card and verify conflict handling.
4. Explicitly request recommendations; verify zero-to-three truthful cards and full
   text equivalent. Select an exact idea, generate approved variants, save revision,
   and compare saved IDs/input lineage across card, tool text and server read.
5. Open a new chat, retrieve by durable ID (or adopted authenticated lookup), and
   verify saved content without generation. Repeat on a narrow supported surface.
6. Exercise timeout/reconnect/cancel using an approved fixture path. Do not induce
   extra paid calls to test recovery. Verify no silent retry after ambiguous start.
7. With separately authorized accounts, test denied cross-account reads/actions,
   expired/revoked connection behavior and clearing; record limitations while idle.
8. Capture light/dark, keyboard, resize, untrusted text and CSP observations. Save
   sanitized screenshots and tool outcomes, never bearer tokens or provider secrets.

Passing local suites cannot establish these host results. No D hosted, provider,
Supabase multi-connection or actual ChatGPT proof is claimed by this PR.

## Dependencies and review requests

- **Bangkok / D0:** merged executable operation schemas/scopes and fixtures; job status
  revision ordering; request receipt recovery when start response/job ID is lost;
  cancellation/late completion and ambiguous spend semantics; stable result lineage;
  expected versions for selection/save; script candidate versus saved revision policy.
- **Bangkok / reopen:** decide ID-based retrieval and any account-scoped discovery
  operation needed when a later chat has no ID. A global/social-URL lookup cannot
  substitute for account authorization. No extra schema is defined here.
- **Shanghai:** acknowledge or revise presentation/event requirements above and supply
  exact component exports against merged D0, plus missing-design coverage inventory.
- **Nagoya:** agree operation/scope/ownership matrix and coordinate tool-list tests.
- **Bangkok / build:** approve resource entry points after UI exports; own shared build
  changes. Review annotations and the polling proposal before production wiring.

These block production integration, not this preparation deliverable. Next Berlin PR
will wire only merged operations and documented components with dedicated tests.

## Validation and sources

Validation on kickoff baseline plus this document:

- `npm ci`: passed; lockfile unchanged. Existing three high audit findings remain
  tracked by the lead in panel-build documentation; no dependency changes made.
- `npm run build:panel`: passed, 534861-byte existing project-review bundle.
- `npx --no-install tsx --test tests/project-review-bridge.test.ts tests/project-review-mcp.test.ts`:
  25/25 passed. Existing controller/auth/schema/resource tests, including local
  signed-token/PGlite ownership fixtures; these are not D operation tests.
- `node --test tests/integration/project-review-runtime.test.mjs`: 1/1 passed
  (22.9 seconds), real local workerd resource plus Chromium simulated host.
  Existing refresh/timeout/auth clearing/source filtering/teardown coverage;
  this is not actual ChatGPT or D creator-loop rendering.
- `git diff --check`: passed. Only this evidence document changes; no duplicated
  schemas, fixtures or throwaway production wiring are added.

No shared implementation changed, so a full `npm run check` was not required for
this documentation increment. Planned D-I01–D-I13 cases await their dependencies.

Official OpenAI documentation checked 2026-10-09:
[UI bridge/resources](https://developers.openai.com/plugins/build/chatgpt-ui),
[metadata reference](https://developers.openai.com/plugins/reference), and
[server authorization/annotations](https://developers.openai.com/plugins/build/mcp-server).
These support standard UI metadata, optional UI with useful text, per-request server
authorization and behavior-based annotations; they do not approve Kettle's proposed
operation names, polling policy or spending. Installed baseline is ext-apps 1.7.5,
MCP SDK 1.32.1; existing bridge uses App/PostMessageTransport, serverTools capability,
AbortSignal/deadlines and explicit resize cleanup. No upgrade is assumed.

## Read-only MCP bridge/resource follow-up — 2026-10-09

Bangkok approved the production entry/resource names and requested bridge work while
retaining ownership of shared build, MCP registration and auth composition. Incorporated
shared flag commit `0e5324516fc3948d22f36cd63e77f3455c77475f` (including merged PRs 21–23)
by fast-forward on the existing branch, preserving all previous integration commits.

Owned exports for lead wiring:

- `apps/panel/creator-review-bridge.ts`: browser entry auto-mounts `#root`;
  `mountCreatorReviewBridge(root)` returns `{ refresh, dispose }`. It consumes
  `mountSavedCreatorReview`, accepts only validated `GetCreatorDnaOutput` from
  `structuredContent`, preserves `contains_fixture_data`, and uses only
  `get_creator_dna` with the exact selected `GetCreatorDnaInput` for explicit reads.
- `apps/worker/creator-review-resource.ts`: `registerCreatorReviewResource(server)`,
  `CREATOR_REVIEW_URI`, `CREATOR_REVIEW_MIME`, `CREATOR_REVIEW_META`, `creatorReviewHtml`.
  URI is `ui://kettle/creator-review-v1.html`; MIME is `text/html;profile=mcp-app`.
  Static resource imports `creatorReviewScript` from the approved generated module;
  script escaping and empty network/asset/frame/base-URI CSP follow project review.
- Lead registers `render_creator_dna` with `GetCreatorDnaInput`, executes the authenticated
  filtered operation and supplies complete text plus structured output. Lead retains
  ownership of scopes/challenges, tools/list consistency, SDK output-schema workaround,
  and `authServices.creatorOperations` composition. This follow-up registers no tools.

No mount-time reads, polling, provider calls, corrections, jobs, credentials, storage,
or model-context writes. Parent WindowProxy filtering uses the installed SDK transport.
Handlers precede connect; initialization and reads are bounded. The controller deadline
precedes the SDK hard deadline so timeout recovery retains the explicit retry path.
Auth failures and invalid envelopes clear the UI; late responses cannot restore it.
Resize observers/frames and requests are cleaned up on pagehide or host teardown;
teardown is acknowledged before closing. Host CSS/fonts are not injected.

The component currently has no Refresh callback/button. The bridge exposes explicit
`refresh()` for the future UI seam; users currently reopen via `render_creator_dna`
in chat. No competing inline control was implemented. Text fallback remains a server
registration responsibility, using the full filtered public output (the controller's
`creatorDnaText` tests cover completeness).

Validation uses real ext-apps 1.7.5 / MCP SDK 1.32.1 and the real UI in Chromium under
a local parent-frame fixture, plus an in-memory SDK resource client/server. It proves
handshake, parent-source rejection, no automatic reread, exact read selection, duplicate
suppression, timeout/retry/late-response behavior, auth clearing, no-tools display,
missing-handshake recovery, top-level rejection, theme/locale, size notifications and
teardown cleanup. Resource tests cover list/read metadata, the real static script and
HTML escaping; envelope tests reject text/private-meta fallback and contradictory errors.
Existing controller tests continue covering IDs, versions and complete text fallback.

Shared build wiring is intentionally pending: for local validation only, an ignored
`.context/d-integration/build-creator.mjs` invokes existing esbuild on the real entry and
writes the approved ignored generated artifact. No stub or generated bundle is committed.
A clean checkout needs Bangkok's creator build hook before tests/typecheck/runtime import
of the new resource. The normal project build hook remains untouched.

Rechecked official [OpenAI UI documentation](https://developers.openai.com/plugins/build/chatgpt-ui)
and [MCP App API](https://apps.extensions.modelcontextprotocol.io/api/classes/app.App.html)
against installed APIs. These checks and local iframe tests are not actual ChatGPT proof.
Remaining lead/host checks: combined shared build and Worker resource routing, authenticated
render/read tool metadata and second-account denial, hosted resource rendering and refresh
or reopen after corrections, token revocation, no-UI complete text, and persisted fictional
labels after Shanghai's follow-up. No deployment or hosted mutations performed.

Final local validation after incorporating `0e53245`: `npm run check` passed with
154 TypeScript tests, 28 browser checks, both TypeScript projects, Worker dry-run build
and local workerd smoke. The manually generated real Creator DNA artifact was 552,566
bytes. Logs: `.context/d-integration/bridge-final-check.log` (workspace-local).
`git diff --check` passed. These results require the local artifact step described above;
they do not claim the pending shared build hooks or Creator DNA Worker routing are proven.
