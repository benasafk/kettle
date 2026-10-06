# Run the Stage 1 foundation

Stage 2 development adds an optional authenticated mode and generation evaluation.
See [Stage 2 verification and blockers](stage2-verification.md),
[authentication setup](auth-stage2.md), and [generation evidence](generation-stage2.md).
The commands below still default to a credential-free, diagnostic-only Worker.

Prerequisite: Node 22 or newer and npm. The lockfile pins the installed dependency tree.
No credentials, Cloudflare account or database are needed for the default run/check.

```sh
npm run setup
npm run dev
```

Open the URL printed by Wrangler. `/` is a minimal website shell; `/health` returns
service status; `/mcp` is a Streamable HTTP MCP endpoint exposing only
`kettle_diagnostic`. Without auth configuration there is no working login or ChatGPT handoff.

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
npm run db:migrate # append pending migrations to ONLY this workspace's local database
npm run db:test    # real local PostgREST, separate-process read, concurrency and rollback
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

`npm run db:test` requires `db:start` and `db:migrate`. It derives the local container
and API endpoint from this workspace, reads local credentials into memory, creates
temporary fictional records, and removes them in a finally block. Its receipt-failure
trigger is restricted to one generated request/account. It never accepts a remote
target or resets data. A separate Node process verifies persistence after application
state is discarded. This is a database integration test, not real OAuth proof.

`npm run eval:generation` produces inspectable authored fixture outputs under `evals/`.
It has no live switch and cannot spend based on credentials in the environment.

## Opt-in hosted development smoke test

After CLI login, linking an explicitly authorized development project and applying
the reviewed migration, run:

```sh
KETTLE_TEST_PROJECT_REF=your-development-project-ref npm run smoke:supabase
```

The project must match the local CLI link. This test accesses server/anonymous API
keys through the authenticated CLI without printing or saving them. It creates two
temporary fictional accounts, calls the real PostgREST adapter, tests concurrent
saves and access denial, and removes only its generated records in a `finally` block.
It does not apply migrations or reset a database. If cleanup fails, the command fails;
inspect temporary smoke accounts before another run. This command is deliberately
excluded from `npm run check` and CI. It does not verify real OAuth.

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
