# Milestone C Integration — Berlin

Implementation PR: [#6](https://github.com/gustasbull/kettle/pull/6).
Baseline `7203fad` and approved build prerequisite `1bfaee82` are ancestors.
Bangkok owns shared changes, review, merges and deployments. No deployment,
secrets change, provider spend or business-contract change was performed.

## Delivered behavior

- `show_project_brief` is a transport alias for the existing authenticated
  `operations.execute('get_project', bearer, input)`. It uses the exact
  `GetProjectInput` / `GetProjectOutput`, `projects:read`, ownership enforcement,
  existing OAuth challenges, full JSON text fallback and `isError` semantics.
- Registration and overridden `tools/list` use one descriptor definition. The
  success-object SDK output-schema workaround remains; the published schema is
  the full existing success/failure union. Ordinary save/read tools have no UI
  template attached. Default MCP Apps visibility permits the UI's `get_project`.
- Auth-configured servers expose `ui://kettle/project-review-v1.html`, MIME
  `text/html;profile=mcp-app`. Resource discovery/read share metadata, no browser
  permissions and empty network/asset/frame allowlists. HTML contains only the
  static bundle, never caller data or credentials. Inline support is declared in
  bridge capabilities and resource metadata; actual host presentation remains a
  host acceptance check.
- `bridge.ts` consumes the UI owner's exact `mountProjectReview` export. It
  validates complete tool results, binds to explicit project IDs, makes no launch
  reread, permits only explicit refresh, suppresses duplicates, prevents version
  regression and ignores obsolete completions. It never writes, polls, fetches,
  persists data, forwards chat messages or receives credentials.
- Both handshake and refresh have ten-second bounds. Refresh timeout or a valid
  `UNAVAILABLE` retains the last snapshot with the UI's previously-loaded warning
  and explicit retry. Other failures clear private content, including unknown host
  rejections that might represent auth denial. Invalid/mismatched payloads are
  rejected. The server's challenge remains available to the host unchanged.
- `PostMessageTransport(window.parent, window.parent)` validates the source peer.
  Light/dark changes use the SDK theme helper; fonts remain system fonts. Resize
  uses SDK notifications with explicitly cancelled observer/animation lifecycle.
  Browser testing found ext-apps 1.7.5 automatic resize did not clean itself up on
  close; this adapter avoids that late-send error. Teardown acknowledges before
  closing; pending reads, listeners and UI are disposed.
- With no host tool-call capability, the documented error/reopen state provides
  guidance and no refresh button. This conservative fallback clears the snapshot;
  it does not extend the UI state contract or pretend that refresh is available.

## Dependency and UI integration status

Bangkok approved ext-apps **1.7.5** and esbuild **0.28.2**, implemented in main
`1bfaee82`; this branch safely merged main and ran `npm ci`. See the lead-owned
[build contract](../panel-build.md). `npm run build:panel` produces
`apps/panel/generated/project-review-bundle.ts`, exporting `projectReviewScript`.
No generated bundle is committed. The Worker HTML assembler also escapes script
closing sequences and HTML comment openers.

Local combined tests used the exact two UI source files from PR #7 commit
`d937bde0723b71eb0019660154dd311bf879bf31`, temporarily materialized as untracked
files. They were not edited, committed or merged by Integration. No temporary
component stub is shipped. Earlier controller-only experiments used a local stub;
all final results below use the real UI component and approved installed packages.
Until Bangkok integrates UI, a clean checkout of this PR intentionally fails the
lead's build when the component is missing; there is no fallback fixture bundle.

### Remaining shared requests to Bangkok

1. Review/merge UI PR #7 before integrating this PR, then update this branch from
   main and rerun combined checks. Consume the exact documented export.
2. Resolve the combined TypeScript environment collision. `npm run check` currently
   stops at the UI's DOM `Element.append(Node...)` calls, which conflict with
   Wrangler's global HTMLRewriter `Element.append(string | ReadableStream | Response)`.
   Proposed lead fix: separate browser and Worker TypeScript programs, taking care
   that Worker-test imports do not pull panel source into the Worker program.
   Coordinated UI DOM API changes are an alternative. Integration did not change
   shared tsconfig or UI source. Targeted browser compilation passes.
3. Append `show_project_brief` to `tests/auth.test.ts`'s exact tools-list assertion,
   as Bangkok has agreed to coordinate with this integration. Auth tests are outside
   this workstream's edit ownership.
4. The browser runtime test uses an external Playwright installation; Bangkok owns
   any pinned browser dependency or root-test wiring. No extra package was added.

Requests and progress were reported directly in PR #6 comments. No other shared
contract, database, runtime-binding or secret changes are requested.

## Verified locally — 2026-10-06

| Check | Result / boundary |
| --- | --- |
| Dedicated MCP/controller tests | **25 passed**; 22 controller cases plus 3 MCP/resource cases |
| Real SQL + signed-token fixture | PGlite executes actual migrations/RPCs; account A save/render/update/reopen, anonymous/scope/expired-token denial, injected owner/snapshot rejection, and account B reads indistinguishable from missing projects |
| Tool/resource delivery | Real registered server publishes the expected full schemas, scopes, annotations and UI metadata; complete text matches the authorized snapshot; static resource is identical across accounts and excludes tokens/project IDs |
| Workerd + Chromium bridge | **Passed**, serving the real generated bundle through MCP `resources/read`, then loading that returned HTML in a fixture host iframe |
| Browser lifecycle | Actual SDK initialize/capabilities, no initial read, exact explicit refresh, duplicate suppression, hostile markup as text, sibling-window rejection, dark theme, ten-second timeout/retry/late result, auth clearing, teardown acknowledgment, missing capability and silent-host timeout |
| Browser CSP/network | Fixture CSP disables network and unsafe-eval; component runs; zero browser network requests and zero uncaught page errors |
| Targeted browser TypeScript | Passed for bridge, imported real component and controller tests |
| Worker dry-run build | Passed, no deployment; final changes rebuilt by the runtime test |
| Existing workerd smoke | Passed: health/website, diagnostic-only auth-unconfigured MCP, origin rejection, local Workflow, JWT/PKCE/cookie fixture |
| Broad `npm test` | 78/79 passed; sole failure is the coordinated auth list assertion |
| Full `npm run check` | Blocked at shared DOM/Workers type collision described above; not claimed green |
| Diff whitespace | Passed |

PGlite is not hosted Supabase/PostgREST or multi-connection concurrency proof.
Runtime auth uses local signed JWT fixtures. Browser `tools/call` responses are
fixture-host messages; no live ChatGPT OAuth or bearer is injected into the iframe.
The signed SQL test and host lifecycle test prove their respective boundaries,
not one live hosted end-to-end session.

## Repeatable checks after prerequisite integration

```sh
npm ci
npm run build:panel
npx --no-install tsx --test tests/project-review-bridge.test.ts tests/project-review-mcp.test.ts
# Use an existing Playwright index.mjs, or omit this variable if Bangkok installs it.
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node --test tests/integration/project-review-runtime.test.mjs
npm run check
```

`tests/integration/project-review-worker.ts` is a local fixture entrypoint, never
referenced by production Wrangler configuration. The runtime test uses temporary
local state and deletes it afterward. Its screenshot is generated in the current
workspace at `.context/project-review-integration/local-host-dark.png`, with only
fictional data. No environment or `.context` files were copied between workspaces.

## Remaining actual ChatGPT acceptance — Bangkok

After review and lead-controlled development deployment:

1. Refresh connector/tool discovery and confirm `show_project_brief` resource
   association, inline placement, CSP acceptance and complete text-only fallback.
2. Open an owned saved project by ID; compare all fields and saved version with
   `get_project`. Verify loading does not issue another database read.
3. Save a chat correction using unchanged expected-version/request-ID semantics;
   explicitly refresh the existing card, reopen it, then reopen in a later chat.
4. Test narrow/mobile presentation, light/dark theme, actual host resizing,
   keyboard interaction, facts/source-link safe fallback and text zoom.
5. Observe expired/revoked authorization and insufficient scope: private content
   clears on observed denial, host presents its OAuth recovery where appropriate,
   and reconnect/reopen resolves the intended account. Verify a second account
   cannot retrieve the first account's project through render or refresh.
6. Verify timeout/retry, same-version refresh, and an unavailable/deleted project
   on the actual host. Older conversation widgets remain snapshots; no immediate
   global revocation or deletion of already delivered conversation content is promised.

Actual ChatGPT rendering and hosted persistence/reauthorization for this new card
remain **unverified**. No screenshot from the local fixture is ChatGPT evidence.

## Official documentation and installed APIs

Checked 2026-10-06:

- [Official OpenAI UI documentation](https://developers.openai.com/plugins/build/chatgpt-ui):
  standard resource linkage and bridge lifecycle; authoritative tool results and
  usable text fallback. [Official reference](https://developers.openai.com/plugins/reference).
- [MCP Apps 2026-01-26 specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx):
  initialization, visibility defaults, parent bridge and tool-result lifecycle.
- Installed MCP SDK **1.32.1**, ext-apps **1.7.5**, Zod **4.6.5**, esbuild **0.28.2**:
  inspected `App.connect(transport, options)`, `callServerTool`, capabilities,
  `PostMessageTransport` source checking and resize implementation; exercised the
  actual packages in Chromium and the existing server SDK in workerd.
- [Cloudflare Request API](https://developers.cloudflare.com/workers/runtime-apis/request/):
  retain the existing Fetch Request/Response transport boundary.
