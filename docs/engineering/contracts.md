# Initial application contract v1.0.0

Stage 2 preserves these v1 schemas and application operations. A real JWT verifier,
server-only identity mapping and optional authenticated website/MCP registration
are now implemented; see [auth setup](auth-stage2.md) and [current evidence](stage2-verification.md).
The default unconfigured Worker still exposes only `kettle_diagnostic`. Historical
Stage 1 statements below about missing implementations refer to that baseline.

Executable source: `packages/contracts/index.ts`. Draft generation, reference and job
schemas are explicitly separate in `drafts.ts`; they are not public tools or tables.

## Tools

| Operation | Input | Success data | Required scope |
| --- | --- | --- | --- |
| `get_account_state` | Strict empty object | Account, unconfigured entitlement/usage state, null reset date | `account:read` |
| `get_project` | `project_id` UUID | Project with its current brief snapshot | `projects:read` |
| `save_project` | Full snapshot below | Saved project snapshot and `request_id` | `projects:write` |

Only `kettle_diagnostic` is registered on the Stage 1 MCP server. These product
operations run through the application boundary in tests; Stage 2 must integrate
authentication before registering them. Reads are read-only/closed-world; save is a
non-destructive, idempotent write when retried with identical content and request ID.
Stage 2 emits both structured output and usable text, and uses `isError: true` for
application failures. Missing/invalid OAuth credentials also require the supported
HTTP 401/WWW-Authenticate and tool auth metadata/challenge where applicable.

All inputs and outputs are strict, bounded Zod schemas. Unknown fields, including
`account_id` and `owner_id`, fail validation. Blank text, malformed UUIDs, duplicate
fact IDs, invalid duration and invalid create/update version combinations fail.
URLs are optional fact sources and are only stored, never fetched in Stage 1.

Example description-only create (all IDs below are fictional):

```json
{
  "request_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "project_id": null,
  "expected_version": 0,
  "name": "Desk lamp",
  "project_type": "brand",
  "brief": {
    "product": "A rechargeable desk lamp with three brightness settings",
    "audience": "Remote workers",
    "goal": "Show a home desk setup",
    "tone": "Practical",
    "language": "en",
    "duration_seconds": 20,
    "filming_constraints": ["One person", "Home desk"],
    "facts": []
  }
}
```

Update uses the returned `project_id`, its positive `current_version` as
`expected_version`, a new request UUID and the full replacement snapshot. This
avoids ambiguous partial nested edits. Creation returns version 1. Every update,
including a rename, appends a brief snapshot; no old snapshot is modified.
Reopening returns the latest version; replaying a successful request returns its
original snapshot even if newer edits exist. Failed writes have no receipt and
make no changes. Successful receipts currently have no expiry.

## Identity and records

`createOperations(verifier, repository)` is the shared website/MCP entry boundary.
It verifies a credential, checks scopes, validates input, and sends the verified
internal account ID separately to storage. `IdentityVerifier` is a trusted server
dependency, not a user-selected implementation. It must validate signature, issuer,
audience, expiration, token use and scopes, then resolve `(issuer, subject)` to an
account. Website sessions require their own validation and CSRF protection.

No production verifier, issuer-subject mapping, fake token route or auth bypass
exists. Stage 2 evaluates Supabase Auth first and Auth0 as an alternative. Neither
an email match nor the value of a model-supplied ID can establish account ownership.

Accounts have internal UUIDs, display names, active/suspended state, preferred
language and creation time. Database projects carry owner UUID, type, name, current
version and timestamps. Brief versions carry their own UUID, project/owner/version,
name, brief JSON and creation time. Fact provenance is versioned inside the brief;
user-supplied facts and URLs are not claims of independent verification. Public
project outputs omit owner IDs. A composite foreign key enforces matching ownership
and a deferred foreign key enforces a valid current brief pointer.

UUIDs are opaque stable IDs (Postgres generates new record IDs). Request IDs are
caller-generated UUIDs scoped to the verified account across writes. UTC/offset ISO
timestamps are returned; SQL stores timestamptz. Counters are positive integers.
The v1 provisional brief supports brand projects, 5–180 second videos and bounded
text/facts. These limits are engineering bounds, not approved product pricing/scope.

## Atomicity and database access

`kettle_save_project` locks the account, checks its state, checks the receipt,
verifies ownership/version, appends the snapshot and records the response in one
transaction. Account-level serialization is a simple initial choice; optimize after
measurement. Same ID + different parsed JSON produces `IDEMPOTENCY_CONFLICT`.
JSON object key order is immaterial; array order remains meaningful. The application
normalizes trimmed strings before database comparison. The server role is trusted
to call RPCs only through validated operations; SQL is not a duplicate JSON validator.

The Supabase adapter calls PostgREST over HTTPS with a server-only service role.
RPC execution and tables deny anonymous/authenticated client roles. All four tables
enable RLS with no client policies; the privileged role bypasses RLS, so RPC owner
filters and the verified application identity remain essential. Service role cannot
update/delete brief history or successful receipts. No browser has direct DB access.

## Errors

Every result is `{ok:true,data:...}` or `{ok:false,error:{code,message,retryable,recovery}}`.
Database/internal exceptions are sanitized; raw credentials and SQL errors never
enter results. Error messages are bounded. `UNAVAILABLE` is the only automatically
retryable v1 error, and a write retry must reuse the same request ID and content.

| Code | Recovery |
| --- | --- |
| `UNAUTHENTICATED` | Connect/reauthorize; no storage access |
| `FORBIDDEN` | Missing scope, unavailable account or suspended project access; resolve account access |
| `VALIDATION_ERROR` | Correct fields using executable schema; no write |
| `NOT_FOUND` | Missing or another account's project; same response to avoid disclosure |
| `VERSION_CONFLICT` | Reload, reconcile, submit a new request against the new version |
| `IDEMPOTENCY_CONFLICT` | Use a new ID for intentionally changed content |
| `UNAVAILABLE` | Bounded retry with the original ID; saved work preserved |

Suspended accounts can inspect their own account state but cannot read or save
projects. This is a provisional security default; subscription access policy is not
implemented or inferred from account state.

## Later conventions (draft)

Jobs use Kettle UUIDs independent of Workflow instance IDs, pinned brief versions,
request IDs, `queued/running/succeeded/failed/cancelled`, real named steps and
separate cancellation intent. A retry is an attempt within one logical job. Durable
dispatch/outbox recovery and cost settlement are not implemented in Stage 1.

Provider results distinguish live versus fixture provenance, matched versus no-match,
observation time, permitted-use basis, latency and measured/estimated/unknown cost.
Scripts have spoken lines, shots, on-screen text, fact/reference IDs, language,
explicit estimated duration and input versions. Draft schemas enforce structure only;
Stage 2 must evaluate factual support, provider permissions and script quality.

## D0 creator-profile boundary — 2026-10-09

`packages/contracts/creator-profile.ts` is an additive internal schema module. It
exports strict Zod schemas and inferred types for `ProfileScanRequest`,
`CreatorIdentity`, `ObservationProvenance`, `ProfileObservation`, `VideoObservation`,
`ScanCoverage`, `ScanCostEvidence`, `ProfileScanResult`, `DnaClaim`,
`CreatorDnaSnapshot`, `CreatorAnalysis`, and `CorrectCreatorDnaInput`.
It does not change v1 tool registration, OAuth scopes, `drafts.ts`, or existing
project types. Do not register these as public tools without the application gate.

Generation must validate complete `CreatorAnalysis` envelopes, not just detached
DNA snapshots: the aggregate checks identity, source scan, observation references,
modalities and analysis permissions. Distinct dated observations of the same stable
platform/video ID are retained; observation IDs themselves must be unique. Counts
are safe nonnegative integers; unavailable metrics are explicit nulls. Unknown cost
remains null with `usd_basis: unknown`; known USD values require a measurement or
conversion basis. Native credits remain separate. No budget or permission is granted
by schema acceptance.

Only TikTok profile scan requests are executable input shapes in this increment;
Instagram identity vocabulary is reserved for later platform support. Request limits
are 1–50 videos and 1–3 pages, matching the bounded fixture characterization; these
are structural ceilings, not an approved live run. URLs must be canonical HTTPS
platform URLs without credentials/query/fragment. Resolving redirects, preventing
SSRF, validating video/profile paths and translating provider URLs remain adapter
responsibilities; URL validation is not permission to fetch.

`complete` means a bounded requested sample reached its video/page limit or the feed
was exhausted without known omissions/errors. It never means an entire profile was
scanned. Empty exhausted samples are valid. Partial/unavailable/failed scans retain
limitations; coverage includes admitted unique counts, page cursors/counts, observed
publication-date range, omissions and allowlisted errors. Date coverage describes
admitted observations, not requested time filters. Cursors must be provider pagination
values, never tokens, cookies or signed URLs. No raw response/error bodies belong in
these schemas. Cached source observation time is distinct from retrieval time.

DNA claims preserve observed/inferred/user-corrected attribution and explicit
uncertainty. Video evidence needs a bounded time range, known media duration and
media-analysis permission. Caption-only pacing and explicitly visual claims fail.
Image analysis likewise requires media-analysis permission. These structural checks
cannot understand free-text claims: Generation must test that visual claims are
marked `requires_video`, that audience inference is labelled inferred, and that
country-only or small-sample evidence does not support broader demographic or causal
claims. Factual/evaluation review remains necessary even for valid schemas.

Corrections identify the existing DNA, expected version, request ID and targeted
claim IDs with replacement text only. Callers cannot replace provenance/evidence.
The future application must authorize the account, resolve claim membership, append
new claim/snapshot IDs with `user_corrected` attribution and prior-claim lineage,
preserve source evidence, reject stale writes, and replay account-scoped receipts.
A snapshot alone cannot prove that a superseded claim existed. No persistence,
idempotency, ownership enforcement or correction operation is implemented by D0.
Correction entry stays in chat first; UI can display read-only DNA and recovery
states until these operations are integrated. Inline editing is not required yet.

Shared fictional fixtures are exported from
`packages/contracts/fixtures/creator-profile.ts`:
`creatorAnalysisFixture()`, `partialScanFixture()`, `unavailableScanFixture()`.
They return fresh data and are for tests/previews only, never a production fallback.
Generation's provider-shaped fixtures remain separate. UI must project only the
visible claims, coverage, evidence and limitations; never expose internal provider
cursors, accounting attempts or unrestricted provenance through a card/model context.
A permission-safe public projection is still an application/Integration prerequisite.

Next contract increments: owned associations and repository operations, durable jobs
and spend reservation/settlement, recommendation batches/selection, then script
variants. Their public names, scopes, lifecycle rules and migrations are not frozen
by this first D0 slice. Auth's proposed new scopes remain proposals.
