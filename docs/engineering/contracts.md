# Initial application contract v1.0.0

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
