# Milestone C — Saved project review in ChatGPT

Status: implementation brief prepared by Bangkok on 2026-10-06. The user approved
the project-review card as the first UI milestone and requested separate workstreams.
This document defines the integration contract; implementation starts after the
brief is integrated into `main`. No implementation or deployment is included here.

## Outcome and scope

A user can ask Kettle to show an existing saved project and receive an inline card
containing its authoritative brief and saved version. After correcting the brief
through chat, they can refresh the card to retrieve the latest persisted snapshot.
The same project can be reopened in a later conversation.

This milestone renders existing brand projects. It does not generate scripts,
fetch websites, create reference libraries, list projects, implement Vault, or add
billing. No migrations or changes to v1 business contracts are needed. Creator and
founder screens, Studio, discovery and generation remain subsequent milestones.

## Visual source and presentation

Source: [Kettle · Core workflows in Paper](https://app.paper.design/file/01M39TTB7DKFHZY2JVDMAEDZ81/p-5-0),
screen **1.5B — Review project · editable details**, component **Review your project ·
editable fields**. The repository's older “Core foundations” page name is historical.
Read Paper's JSX/styles/tokens for exact design values; preserve the original page.

Use its heading, product summary, aligned label/value rows, rounded surface and
spacing. Render only Kettle's card: attribution, chat history and the composer in
the design are host-owned. Do not recreate them inside the component. Use a generic
project mark rather than the example FocusNest logo; no inferred brand image or URL.
Use system fonts initially rather than adding third-party font requests; retain the
exported hierarchy and spacing. Any later font bundling goes through Bangkok.

Presentation is inline only: this is a focused, read-only review of one brief.
Support 320px through 640px component widths without horizontal overflow; stack
labels and values on narrow screens. Respect host light/dark theme, keyboard focus,
reduced motion, text zoom, and accessible status announcements. Long brief content
must wrap; lengthy facts can use an accessible disclosure, with all content available.

## Authoritative data and visible fields

Reuse `GetProjectInput`, `GetProjectOutput`, `Project`, `Brief`, and `Failure` from
`packages/contracts/index.ts`. Do not create a parallel project or brief schema.
The complete `structuredContent` envelope is:

```ts
{ ok: true, data: { project: Project } }
// or the existing Failure:
{ ok: false, error: { code, message, retryable, recovery } }
```

| Visible content | Source / rule |
| --- | --- |
| Heading | “Your project brief” — does not imply website analysis |
| Project name | `project.name` |
| Saved version | `project.current_version`, labelled “Saved version N” |
| Product summary | `project.brief_version.brief.product` |
| Audience | `brief.audience` |
| Goal | `brief.goal` |
| Tone | `brief.tone` |
| Language | `brief.language` |
| Target duration | `brief.duration_seconds`, labelled as a target, not measured speech |
| Filming constraints | `brief.filming_constraints`; empty means “No constraints recorded” |
| Supplied facts | `brief.facts`; distinguish `user_confirmed` from unconfirmed facts |
| Fact provenance | Source kind and captured date; URL sources may show a safe HTTPS/HTTP source link |
| Empty facts | “No supporting facts recorded” |
| Footer | “Tell me what to change in chat. Refresh after your changes are saved.” |
| Action | “Refresh brief” — read only |

The Paper example also contains niche, benefit, content angles and a website. These
are not independent fields in v1; omit them rather than inventing or silently deriving
them. Displaying a source URL does not authorize fetching it. Treat every field as
untrusted text, never executable HTML. External links must use the host's supported
link API or a safe fallback; no automatic navigation or embedded provider content.

## MCP resource and render tool

Integration owns the transport-only render tool; it is not a new database operation.

| Item | Agreed value |
| --- | --- |
| Tool name | `show_project_brief` |
| Input | Exactly `GetProjectInput`: `{ project_id: UUID }` |
| Required scope | `projects:read` |
| Server action | `operations.execute('get_project', verifiedBearer, input)` |
| Structured output | Exactly `GetProjectOutput` |
| Resource URI | `ui://kettle/project-review-v1.html` |
| Resource name | `kettle-project-review` |
| Resource MIME type | `text/html;profile=mcp-app` |
| Tool metadata | `_meta.ui.resourceUri` pointing to the resource URI |
| Display modes | Inline only, declared on the resource and during bridge initialization |
| Tool annotations | Read-only, non-destructive, idempotent, closed-world |

Suggested description: “Show the saved brief for an existing Kettle project as an
inline review card. Use its explicit project ID. After saving corrections, call this
tool to show the saved version. This tool does not generate content or save changes.”

Only register the render tool/resource when real auth services are configured, as
with the existing product tools. Resource HTML is static and contains no account,
project data, tokens or credentials. All project reads require the normal verifier,
scope checks and ownership-enforcing application operation. Do not accept a caller's
brief snapshot or account ID as input to the render tool.

Preserve complete text fallback and structured data for non-UI clients. Mirror the
existing auth challenges and `isError` behavior. Keep `get_project` and `save_project`
as data tools; do not attach the UI template to every save/read. The current MCP
implementation overrides `tools/list`: ensure the render tool's schemas, OAuth
metadata and UI metadata are present in both registration and the published list.
Retain the SDK's success-object output-schema workaround and full contract validation.

Start with no external asset/network domains in the component CSP. Request no browser
permissions. Dependency, bundling or runtime manifest changes must be proposed to
Bangkok. No credential may reach the browser; UI calls go through the host bridge.

## UI / Integration seam

The following is an agreed presentation interface, not a new business contract.
UI owns `apps/panel/project-review.ts` and exports:

```ts
import type { Failure, Project } from '../../packages/contracts/index.ts';

export type ProjectReviewState =
  | { kind: 'loading' }
  | { kind: 'ready'; project: Project; refreshing: boolean; warning?: string }
  | { kind: 'error'; message: string; recovery: Failure['error']['recovery'] | 'reopen' };

export function mountProjectReview(
  root: HTMLElement,
  actions: { onRefresh: () => void },
): { render(state: ProjectReviewState): void; dispose(): void };
```

UI owns rendering, styling, accessibility and invoking `onRefresh` on a user click.
It does not own MCP message handling, authentication, network calls or persistence.
`render` must replace stale project content on loading/error states. `dispose` removes
component listeners. Fixtures import this same component without the live bridge.

Integration owns `apps/panel/bridge.ts`, which mounts the component, validates tool
results with the existing schema, manages state and refresh, and cleans up its bridge
listeners. It owns `apps/worker/project-review-resource.ts` for resource metadata and
HTML assembly. Use the MCP Apps standard initialization/result/tool-call lifecycle;
select and verify the supported SDK/protocol version before implementation. Propose
new packages/build commands to Bangkok instead of changing the lockfile independently.

The bridge is the sole component caller of `get_project`. The component does not
send follow-up chat messages or perform writes. Refresh is enabled only after a
valid project result and when the host advertises tool-call support. Without that
capability, show instructions to ask Kettle to reopen the brief in chat.

## Refresh, updates and failure behavior

1. Mount in loading state; complete the host handshake before requesting host actions.
   Use the launching tool result without issuing a duplicate initial database read.
2. Validate and render the complete successful snapshot. Bind refresh to that
   explicit project ID, never the card's position or model-generated title.
3. Refresh calls `get_project` through the authenticated host bridge. Keep the last
   snapshot visible with a refreshing indication; disable duplicate clicks.
4. Accept only a matching project ID on refresh. Never replace a displayed version
   with a lower version from a delayed response. Ignore obsolete request completions
   after a newer result, project change or disposal; same-version refresh is valid.
5. No background polling or implicit regeneration. Chat saves continue to use
   `save_project` with expected-version and request-ID semantics. A chat edit does
   not promise to update every older widget automatically: reopen the card or refresh
   it to see the latest version. Surface the saved version visibly.

| Condition | UI and recovery |
| --- | --- |
| Initial loading | Short loading message; no sample/project data |
| `UNAUTHENTICATED` | Clear displayed private content; instruct reconnect through ChatGPT; preserve server challenge |
| `FORBIDDEN` | Clear content; show access-denied message; no automatic reconnect loop |
| `NOT_FOUND` | Clear content; “This project is unavailable”; do not reveal another owner's project |
| `UNAVAILABLE` / timeout on refresh | Keep last snapshot labelled as previously loaded; explain refresh failed; permit explicit retry |
| Initial timeout / bridge unavailable | Reopen-in-chat guidance, no indefinite loading |
| Invalid schema / mismatched ID | Do not render the payload; clear content and offer reopen guidance |
| Unexpected conflict/validation failure | Show safe recovery guidance; do not write or silently repair input |

Use bounded waits and clean up pending requests. Process messages only from the
expected bridge peer using the selected protocol library/transport. Do not persist
briefs or credentials in localStorage, URLs, analytics or logs. A mounted card is a
snapshot: clearing it on an observed auth failure is not a promise of immediate
global revocation or erasure of content already delivered to the conversation.

## Workstream ownership

These boundaries supersede the broad file ownership in the earlier Stage 2 A brief
for this milestone. They do not authorize changing another workstream's files.

| Owner | Allowed implementation area |
| --- | --- |
| ChatGPT UI | `apps/panel/project-review.ts`, component-only styles/helpers, fixture preview; `tests/panel/` component tests; UI evidence |
| ChatGPT Integration | `apps/panel/bridge.ts`, `apps/worker/project-review-resource.ts`, `apps/worker/mcp.ts`; dedicated MCP/bridge tests and host evidence |
| Bangkok | Shared contracts/application, migrations, dependencies/lockfile, runtime/build configuration, shared docs/decisions; integrated review, merges and deployment |
| Auth | Remaining auth acceptance/evidence; coordinate any edits to MCP files through Bangkok |
| Generation | Existing adapters/evaluations; no changes required for this milestone |

No specialist merges or deploys independently. Do not rename branches, reset work,
copy `.context`/environment files/secrets between workspaces, or start paid calls.
Use tracked fictional fixtures and the same approved interface in both workstreams.
The existing $25 provider budget is not needed by this milestone.

## Acceptance and handoff

**UI PR:** show fixture screenshots at 320px and desktop card width, in light and
dark themes. Exercise long text, empty constraints/facts, confirmed/unconfirmed
facts, loading, refresh and failure states. Verify keyboard access and hostile
markup rendered as text. Include repeatable preview instructions. Do not claim
ChatGPT compatibility from the standalone preview alone.

**Integration PR:** verify resource discovery/read and actual published tool metadata;
success renders the exact authorized saved snapshot; text-only results remain useful;
anonymous, insufficient-scope and second-account calls cannot obtain private data.
Test refresh version/order handling and timeout recovery. With auth unconfigured,
retain diagnostic-only product-tool behavior. Runtime smoke must load the real
resource bundle, not just a fixture replacement.

**Lead acceptance:** run `npm run check` on combined changes; visually compare the
rendered card with Paper; coordinate development deployment only after review. In
actual ChatGPT, open a saved brief, confirm matching version/data, save a chat
correction, refresh/reopen, and verify persistence in a later conversation. Check
mobile/narrow rendering and an auth-recovery path. Record fixture, local-runtime,
and hosted observations separately; host placement is not proved by JSON alone.

Merge order: shared brief first; lead-approved dependency/build preparation if
needed; UI component; Integration consuming its stable export; combined hosted proof.
Both specialists can work concurrently against the documented seam. Integration may
use a temporary local test stub but must not ship a second copy of the UI component.

## Sources checked for this brief

- [OpenAI: Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui):
  standard resource linkage, bridge, decoupled render tools and authoritative state.
- [OpenAI: UI guidelines](https://developers.openai.com/plugins/concepts/ui-guidelines):
  focused inline surfaces and host-native interaction.
- [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx):
  initialization, host capabilities, tool results and resize notifications.
- Existing local `packages/contracts/index.ts`, `apps/worker/mcp.ts` and
  `apps/panel/README.md`; current pinned MCP SDK is 1.32.1.

Implementation agents must verify the selected installed API version before coding.
