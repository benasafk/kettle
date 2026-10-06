# Kettle Tools and Data Proposal

The lead agent should turn these contracts into shared schemas before parallel implementation. Tool names and fields below are proposals, not an existing API. Tools expose user outcomes; internal provider calls, queue operations, and database operations remain server implementation details.

## Common tool contract

Resolve the account from authenticated credentials. Every record lookup and mutation checks ownership. IDs supplied by chat or the panel identify records, but never establish permission.

Writes and paid jobs include a `request_id` for deduplication. Updates include an `expected_version` or `base_version` so stale edits cannot silently overwrite current state. Bound text lengths, result counts, and requested durations in the input schemas.

Return concise structured content and usable text. Include record IDs, versions, explicit status, and actionable errors. Keep provider credentials, raw internal logs, and unrelated customer data out of tool results. Define each tool's authentication scopes, output schema, and read/write annotations from its actual behavior. [MCP server concepts](https://developers.openai.com/plugins/concepts/mcp-server), [authentication](https://developers.openai.com/plugins/build/auth).

## Proposed tools

| Tool | Main input | Result | Behavior |
| --- | --- | --- | --- |
| `get_account_state` | None beyond authorization | Account label, entitlements, usage status, reset date when known | Read |
| `list_projects` | Cursor and bounded limit | Authorized project summaries | Read |
| `get_project` | Project ID | Brief, current version, fact sources, and active work IDs | Read |
| `save_project` | New brief or project ID, changed fields, sources, expected version, request ID | Saved project and version | Write; distinguish creation from update |
| `start_discovery` | Project ID, brief version, search preferences, optional prior result and idea IDs, request ID | Job ID and initial status | Write; check entitlement and reserve usage |
| `get_job` | Job ID | State, real progress step, result ID, or failure details | Read; accessible only to job owner |
| `cancel_job` | Job ID and request ID | Cancellation state | Write; best effort for work already at a provider |
| `get_discovery_result` | Result ID | Ordered ideas, reference summaries, top script ID, limitations | Read |
| `generate_script` | Idea ID, brief version, duration and format constraints, request ID | Ready script ID or generation job ID | Write; reuse matching ready work where appropriate |
| `get_script` | Script ID and optional version | Script, relevant brief facts, version, and source links | Read |
| `save_script_revision` | Script ID, base version, candidate sections and shots, request ID | Saved revision or conflict/check details | Write |
| `restore_script_version` | Script ID, target version, expected current version, request ID | A new current revision based on the selected content | Write; preserves history |
| `save_vault_item` | Project ID, idea/script IDs, request ID | Stable Vault item ID | Write; repeated saves resolve to the same item |
| `list_vault_items` | Optional project/status filter, cursor, limit | Authorized saved items | Read |
| `update_vault_status` | Vault item ID, status, optional filmed date, expected version, request ID | Updated item | Write; filmed is user-reported |

Reuse `start_discovery` for a genuinely new reference search. Filtering existing cards and rewriting existing text should not automatically trigger another paid provider query. Use `save_script_revision` for a candidate written by ChatGPT; the tool need not pay for a second writing call unless that is an explicit design choice.

Keep signup, Stripe checkout, webhook handling, and account deletion on authenticated website/backend routes in the initial proposal. Their business rules are shared with the MCP server where appropriate.

## Additional contract gaps from the expanded user flows

The [26-flow inventory](02-user-flows.md) exposes operations the initial tool list does not cover. These are proposed additions, not existing tools or automatic expansion of the first release. Adopt the relevant scope before finalizing schemas. A user flow can use several tools; it does not require one new tool per screen or button.

| Flow | Proposed contract addition | Required behavior / scope |
| --- | --- | --- |
| F03, F20 | `list_jobs` with optional project/state filters | Returning users can find active and recent work even if they lost the original job ID; bounded, authorized read |
| F07 | `create_idea` for a user-supplied concept | Persist project, origin, brief version, and optional permitted sources; then reuse `generate_script`; proposed first-release addition |
| F08 | `import_script` for pasted text | Preserve original, project, user-supplied fact/source context, and request ID; do not require a discovery result; proposed first-release addition |
| F13 | `propose_script_revision` and `accept_script_revision` | Store a candidate without changing current content; accept only against its expected base version; Keep mine needs no content mutation |
| F15 | `list_script_versions` | Bounded history summaries for the owned script; read selected content with `get_script`; restore with the existing version-checked tool |
| F14 | `create_script_variant` | Separate variant identity, source script/version, changed constraints, and its own revision history; later scope |
| F17 | `remove_vault_item` | Remove saved association or mark it unsaved; preserve script/project/history and deduplicate repeated calls |
| F18 | Project archive/restore and deletion routes | Rename can use `save_project`; archive/restore needs lifecycle state; deletion needs explicit confirmation, job handling, and a data policy; later management scope |
| F19 | Library search, part adaptation, and acceptance operations | Read only permitted library content; adapt against selected script/brief; preview before version-checked acceptance; later scope with permission dependency |
| F25 | Optional `submit_feedback` or authenticated website endpoint | Save a rating/report against an owned item with only intended context; no default transcript forwarding; support owner and destination required |

For F11, panel filtering can remain local. In chat-only use, request a bounded result and filter its available cards, or add explicit read-side filters. Only an actual request for new references should invoke `start_discovery`. A critique in chat does not require importing or saving a script; imports follow the user's intent to work on it in Kettle.

F21–F24 also need website/backend routes for billing status, payment-method management, cancellation, reconnection, data export, and deletion. They do not all need MCP tools. Define read/edit/export/discovery access for each entitlement state, including pending payment, scheduled cancellation, failed renewal, expired access, and reactivation. Keep authorization, billing, and deletion state separate.

Cancellation acknowledgement means the request was recorded, not that an in-flight provider operation was successfully stopped. Define a single final outcome when completion races cancellation. Partial results may be offered only if the result contract and persistence actually support them.

## Core records

| Record | Minimum information |
| --- | --- |
| Account | Internal ID, identity-provider subject, state, language preference |
| Entitlement | Account ID, subscription reference, permitted features, period, quota policy version |
| Project and brief version | Owner, project type, name, product, audience, goal, tone, language, filming constraints, version |
| Fact | Project/brief version, statement, source type, source reference, capture time, user-confirmed flag |
| Reference | Provider ID, canonical URL, platform, creator, available metrics with observation times, optional permitted poster/transcript fields, rights record |
| Idea | Project, origin, angle, hook concept, style, rationale; discovery-result ID, reference IDs, and rank when applicable; proposed direct ideas do not require discovery |
| Discovery result | Job ID, brief version, ordered idea IDs, recommended idea ID, ready script ID, limitations |
| Script version | Script ID, parent/base version, authoring origin, language, sections, shots, estimated timing, fact IDs, reference IDs |
| Vault item | Owner, project, optional idea ID for imported scripts, script, optional variant, selected version policy, saved time, status, optional filmed date |
| Job | Owner, type, input versions, request ID, provider request ID if available, state, step, attempts, times, result/error |
| Usage and cost entry | Account/job, operation, reservation or settlement state, provider/model usage, recorded cost or estimate marker |
| Billing event receipt | Stripe event ID, processing state, timestamps, linked account |
| Product event | Event name, account/project or pseudonymous identifier as appropriate, record version, timestamp |

Decide whether Vault shows the latest script revision or a pinned revision; expose that rule consistently. The initial recommendation is to reopen the current revision while keeping all prior versions available.

Additional records/fields follow adopted scope: a revision candidate has its own ID, script ID, base version, content, check outcome, and acceptance state; a variant has a parent script/version and its own current revision; a project has lifecycle state if archive/delete management is included. An imported script retains its original text and origin even if its structured representation changes. Deletion state must prevent a late background job from recreating removed content. Do not invent references for user-origin ideas or scripts.

## Script structure

Each section has a purpose, spoken text, optional on-screen text, filming directions, and an estimated duration. Brand scripts usually use Hook, Showcase, and Call to action. Silent formats may have no spoken text.

Attach source IDs to factual claims. Distinguish product facts from fictional staging instructions such as placing a mug beside a notebook. Automated checks can enforce structure and flag unsupported claims; they do not prove semantic truth or legal compliance.

## Job state and retries

Selected execution target: Cloudflare Workflows, with canonical Kettle job and usage records in Supabase. Keep Kettle job IDs and state independent of workflow instance IDs. Start/status/cancel operations use a small execution adapter so a future Render runner can preserve the same MCP contracts. Supabase Queues is no longer the initial execution proposal. See the architecture for transaction-safe reservation, pending dispatch, and reconciliation across the database and workflow service.

Use `queued`, `running`, `succeeded`, `failed`, and `cancelled` as initial job states. A successful no-match search has a `no_match` result rather than being classified as a technical failure. Save a cancellation request separately while in-flight work is still stopping.

Persist progress steps such as searching, ranking, drafting, and checking. Expose those steps without fabricated completion percentages. Record attempts beneath one logical job. Retrying a delivery must not create another script version or another quota debit. External provider retries can still incur actual costs and must be measured.

Limit attempts, define timeouts, and keep a failed-job record for diagnosis. Separate provider failure from invalid user input. A reference provider returning too little data should produce a useful limitation, not an invented result.

## Errors and recovery

| Error | User-facing recovery |
| --- | --- |
| Authentication required or expired | Connect or reauthorize through the supported host flow |
| Access denied or unavailable record | Explain that the record is unavailable without revealing another account's data |
| Incomplete brief | Ask for the specific missing information |
| Usage limit reached | Explain the limit and reset date when known |
| Unsupported or inaccessible link | Ask for a description or pasted content |
| Provider unavailable | Keep saved work and offer a bounded retry |
| Version conflict | Read the current version, reconcile the requested change, and retry with current context |
| Validation failure | Identify the unsupported claim or structural issue and request a corrected candidate |

## Panel context

Send compact context: project ID, result ID/version, visible ordered idea IDs, selected idea, and selected script/version. Resolve ordinal references against the visible order. Do not assume everything a panel displays is automatically available to the model. Use supported context-sharing APIs and test the chat-only fallback. [MCP Apps UI](https://developers.openai.com/plugins/build/chatgpt-ui), [ChatGPT extensions](https://developers.openai.com/plugins/build/extensions).
