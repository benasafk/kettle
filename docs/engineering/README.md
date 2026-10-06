# Run the Stage 1 foundation

Prerequisite: Node 22 or newer and npm. The lockfile pins the installed dependency tree.
No credentials, Cloudflare account or database are needed for the default run/check.

```sh
npm run setup
npm run dev
```

Open the URL printed by Wrangler. `/` is a minimal website shell; `/health` returns
service status; `/mcp` is a Streamable HTTP MCP endpoint exposing only
`kettle_diagnostic`. There is no working login or ChatGPT handoff yet.

```sh
npm run typecheck  # generates Workers types, then checks TypeScript
npm test          # schemas, operations, provider fixture and PostgreSQL migrations
npm run build     # local Wrangler bundle only; does not deploy
npm run smoke     # starts/stops workerd; MCP client + fixture Workflow checks
npm run check     # all four commands above
```

Smoke uses ephemeral ports and a temporary state directory. It calls the actual
Worker through a local test harness; only that harness has a fixture Workflow
trigger. `wrangler.jsonc` bundles the production entrypoint, without that trigger.
The local Workflow proves execution and serialization, not production generation,
dispatch recovery, retries or quota accounting.

Conductor uses `.conductor/settings.toml` (current format). Shared settings take
effect locally once merged to the remote default branch; use these commands directly
in this workspace meanwhile. `CONDUCTOR_PORT` and its next port are the web and
inspector ports. Outside Conductor, a path-derived block of ten is used; override
with `KETTLE_PORT` if it collides. Configuration is recorded in `.context/workspace.json`.

## Optional full local Supabase

Start Docker Desktop or another compatible Docker daemon, then:

```sh
npm run db:start
npm run db:status
npm run db:reset  # destroys ONLY this workspace's local data; reapplies migrations/fixtures
npm run db:stop   # preserves local data for the next start
```

The wrapper renders `supabase/config.template.toml`, copies migrations and fictional
seed data under `.context/local-supabase/`, and uses a project ID derived from the
real workspace path. API/database/shadow ports use base +2/+3/+4. Never run a generic
linked reset or share local URLs/volumes across workspaces. Port collisions fail
instead of connecting to another workspace's database. Stop a stack before changing
its port block. Status can display local development credentials; do not commit them.

`npm run test:db` always runs independently in a fresh PGlite PostgreSQL instance.
It applies the same migration/seed and supplies the roles normally created by
Supabase. This is real SQL execution, but does not verify Supabase Auth, PostgREST,
Docker containers, network latency or concurrent database connections.

## Layout and next steps

| Path | Responsibility |
| --- | --- |
| `apps/web/`, `apps/panel/` | Website shell; documented panel boundary |
| `apps/worker/` | HTTP/MCP and Cloudflare Workflow adapters |
| `packages/application/` | Transport-independent operations and identity boundary |
| `packages/contracts/` | Executable v1 account/project schemas; separate future drafts |
| `packages/database/`, `supabase/` | HTTPS RPC adapter, transactional SQL and fixtures |
| `packages/adapters/` | Reference/generation seams; explicit no-match fixture |

See [contracts](contracts.md), [decisions and evidence](decisions.md),
[verification](verification.md), and assignments [A](assignments/A-auth-persistence.md)
and [B](assignments/B-generation-references.md). `.env.example` lists future server
configuration only. Stage 1 loads no provider credentials and makes no paid calls.
