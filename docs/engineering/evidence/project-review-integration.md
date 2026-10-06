# Milestone C Integration — Berlin

Status: implementation in progress; not approved for merge or deployment.
Baseline: `7203fad` is an ancestor of this branch. Bangkok owns integration,
shared changes, review, merges and deployments.

## Shared-change request to Bangkok

Please prepare/approve these changes in the lead workspace before integration:

1. Pin `@modelcontextprotocol/ext-apps` **1.7.5**. Its published peer requirements
   accept installed `@modelcontextprotocol/sdk` 1.32.1 and Zod 4.6.5. React peers
   are optional. Latest ext-apps 2.0.3 requires the split MCP SDK 2 packages; no
   SDK migration is proposed for this milestone.
2. Pin a direct `esbuild` development dependency (0.28.2 is already available
   transitively) and provide a browser bundle build. Proposed contract: bundle
   `apps/panel/bridge.ts` (including the UI owner's exact `mountProjectReview`
   export and Zod validation), browser platform, inline IIFE, no remote imports,
   and emit `apps/panel/generated/project-review-bundle.ts` exporting
   `projectReviewScript: string`. The Worker resource module imports that string
   and wraps it in HTML. Escape script-closing sequences during HTML assembly.
   Generated output should be ignored; missing component/bundle should fail the
   build rather than silently ship a stub.
3. Wire bundle generation before dev/build/typecheck/test/smoke, including the
   development dry-run. No Worker bindings, secrets, domains or deployment changes
   are requested. Integration will not independently edit manifests/build scripts.
4. Existing `tests/auth.test.ts` has an exact list-of-tools assertion. Bangkok
   should append `show_project_brief` after `save_project` in that assertion.
   Integration owns dedicated tests and leaves the auth-owned file untouched.

UI dependency: consume `apps/panel/project-review.ts` from the UI workstream,
with the exact documented interface in the milestone brief. No second component
will ship. With no host tool capability the bridge can use the existing error /
reopen state (no refresh action); no new presentation or business contract needed.

## Sources and API inspection

Checked 2026-10-06:

- [Official OpenAI UI documentation](https://developers.openai.com/plugins/build/chatgpt-ui):
  use MCP Apps resource metadata, standard initialization/result/tool-call bridge,
  authoritative server results and complete text fallback.
- [Official OpenAI reference](https://developers.openai.com/plugins/reference).
- [MCP Apps 2026-01-26 specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx).
- Inspected installed MCP SDK 1.32.1 and the published ext-apps 1.7.5 tarball
  declarations, including `App.connect(transport, options)`, `callServerTool`, and
  `PostMessageTransport(window.parent, window.parent)` source-window checking.
  Tarball inspection is not a dependency installation or approval.

## Validation and host acceptance

Pending implementation. Local fixtures, real workerd resource delivery, and actual
ChatGPT rendering will be recorded separately. No hosted rendering, auth tenant
change, paid provider call, merge or deployment is claimed or authorized here.
