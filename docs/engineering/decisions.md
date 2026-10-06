# Stage 1 decisions and open dependencies

Recorded 2026-10-06 by the integration lead. This supplements the root
`07-decisions-and-sources.md`; historical proposals and original files are preserved.
The user's Stage 1 instructions take precedence over the pack's broader milestones.

## Inspection

The workspace initially contained only an empty initial commit. Fetching GitHub
found the complete pack on `origin/main`, rooted at the top level. The uploaded pack
had independent history; a local merge retained both histories and the existing
branch name. No force reset, rename, push or publication was performed.

All requested pack documents are present, plus design checklist, sequence diagrams
and original references. There was no existing application, package manager or active
AGENTS.md. The Paper page has not been edited or used as a verified UI specification;
screen exports and original embedded diagram contents remain absent as the pack says.

## Adopted engineering choices

| Decision | Reason / implication |
| --- | --- |
| TypeScript, npm lockfile, single package | No existing tooling; avoids a monorepo build system before it is needed. Modules still have explicit ownership. Node 22+; tested locally on Node 26.8.2. |
| MCP SDK 1.32.1 + Zod 4.6.5; Wrangler 4.147.0 | Exact runtime dependencies and lockfile; use the SDK's Web Standard transport, tested in actual workerd. No Express/Node HTTP server adapter. |
| Stateless Streamable HTTP; per-request MCP server | Durable user state belongs in Postgres, not process memory or transport sessions. Diagnostic needs no SSE session persistence. |
| Only diagnostic is public | No trusted identity exists in Stage 1. Initial product tools remain internal operations/contracts; no fake-account header or bearer bypass. |
| Cloudflare Workflow adapter with a deterministic fixture step | Proves local binding/execution without paid model calls. Business logic remains outside runtime bindings. No job tables or recovery claims yet. |
| HTTPS Supabase RPC adapter | Workers-compatible fetch and a single Postgres transaction per save. No direct database socket/pool required yet. Real PostgREST integration is pending. |
| Provider-neutral internal account IDs | No `auth.users` foreign key or assumed provider. Stage 2 adds a unique issuer/subject mapping after testing Supabase Auth, with Auth0 as alternative. |
| RLS enabled, no client policies; server role only | Default-deny while identity mapping is unresolved. Privileged operations explicitly filter by verified account ID. This is not end-user JWT RLS proof. |
| Full snapshots, immutable briefs/receipts; expected versions | Keeps lost updates and duplicate writes explicit. Receipts return the original saved response after later edits. Account lock serializes saves simply. |
| Path-derived Supabase project ID, local workdir and reserved ports | Independent Conductor workspaces cannot target the same containers/data. No automatic copying of secrets or development database URLs. |
| PGlite SQL verification without Docker | Executes the migrations, functions, roles and seed locally; full Supabase remains unverified while Docker is stopped. PGlite serializes connections. |
| Current Conductor TOML settings | Uses the bundled skill's current convention, not a conflicting legacy conductor.json. Shared settings need merging to main to activate in the Mac app. |

`strict` TypeScript is enabled. `exactOptionalPropertyTypes` is not enabled because
the installed MCP client transport declares `sessionId: string | undefined` against
the SDK transport interface's optional string. Runtime client connectivity is tested;
we did not hide this SDK incompatibility with unsafe casts.

## Provisional first-release assumptions

- Brand/product briefs are the initial engineering slice, not a final audience decision.
- A description is sufficient; links are optional and source URLs are not fetched here.
- Save and retrieve current briefs precede generation, revisions, Vault and the full UI.
- Full replacement brief saves and 5–180 second durations are reversible v1 bounds.
- Account state distinguishes active/suspended. Entitlements and quota/reset policy are
  explicitly `not_configured`; no trial, price or paid access is implied.
- Suspended accounts may inspect account state but cannot read/save projects.
- Website sessions and ChatGPT OAuth are distinct credentials resolving to one account.

The pack's direct idea-to-script, pasted-script import, candidate/accept, richer
variants, creator/founder workflows, Explore, billing and retention remain proposals
or later decisions. No approved $49 price, ten-run allowance or $0.90 cost target is
inferred. Future contracts stay drafts until the lead integrates the adopted scope.

## Migration ownership

The integration lead is the single owner of shared migrations. Names are increasing
UTC timestamps (`YYYYMMDDHHMMSS_description.sql`); Stage 2 A proposes the next migration
through that owner. Once applied outside disposable local tests, append changes rather
than rewriting history. Resolve timestamp/ordering collisions before integration.
Baseline: `20261006140000_foundation.sql`. `write_receipts` is the necessary supporting
table for account-scoped idempotency, alongside accounts/projects/brief_versions.

## Unresolved dependencies

1. **Local Supabase:** Docker daemon is unavailable. Config parses, but containers,
   real PostgREST and hosted Supabase have not been tested. Start Docker to run `db:start`.
2. **Auth:** compare Supabase Auth with current host OAuth requirements, not merely
   website login. Implement mapping, lifecycle, revoked/expired credentials, metadata,
   scoped token checks and an actual ChatGPT connection. Auth0 is an alternative.
3. **Hosted integration:** development accounts/access, endpoint and OAuth redirects;
   no deployment is authorized in Stage 1. A44 dispatch reconciliation, retry and
   quota settlement need job contracts and later integrated implementation.
4. **Generation:** development OpenAI key/model choice, explicit live-test spending cap,
   approved quality/latency thresholds and real examples. Fixtures cost nothing.
5. **References:** Lightreel fields, usefulness, terms, latency and cost are unresolved.
   No provider access, rights or outreach is presumed.
6. **Product/design:** audience, direct-input scope, examples, Paper exports, public
   handoff URL, entitlement rules and real-user data policies remain owner inputs.

None blocks this local foundation. They gate the relevant Stage 2 live proofs and pilot.

## Official sources checked

- [MCP SDK Web Standard transport](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/src/server/webStandardStreamableHttp.ts): Fetch Request/Response transport; installed declarations and local runtime were also inspected.
- [Cloudflare remote MCP](https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/): Workers as the MCP host. We use the SDK directly for the small stateless diagnostic.
- [Cloudflare local Workflows](https://developers.cloudflare.com/workflows/build/local-development/): local execution via Wrangler; our smoke checks a real local Workflow binding.
- [Supabase migrations](https://supabase.com/docs/guides/local-development/database-migrations) and [CLI configuration](https://supabase.com/docs/guides/local-development/cli/config): migration/seed conventions, project IDs and configurable local ports.
- [OpenAI authentication](https://developers.openai.com/plugins/build/auth): OAuth discovery, resource-bound tokens, PKCE and client identification; used to scope Stage 2, not claim provider compatibility.
- [Conductor repository settings](https://conductor.build/docs/reference/scripts/share-with-teammates): shared configuration. The installed Conductor skill documents TOML precedence and allocated port blocks.

These sources establish supported mechanisms, not proof that Kettle's hosted
integration works. Package versions were checked through npm and exercised locally.
