# Stage 1 verification — 2026-10-06

For subsequent implementation and personally rerun checks, see
[Stage 2 verification](stage2-verification.md). The entries below preserve the
original Stage 1 evidence and its later hosted-database follow-up.

## Follow-up: hosted Supabase verified

After the user created and linked development project `fdicggstdtthfpcrpujf`, the
public schema was checked and contained no application tables. The migration dry
run showed only `20261006140000_foundation.sql`; that migration was then applied
successfully. The fixture seed was not pushed.

`KETTLE_TEST_PROJECT_REF=fdicggstdtthfpcrpujf npm run smoke:supabase` passed against
the real HTTPS PostgREST API using the repository adapter:

- Account state, project create/read, versioned update and preserved original receipt.
- Rejected stale versions, changed-payload request-ID reuse and cross-account read/write.
- Four simultaneous HTTP saves produced one result. Two competing edits produced one
  success and one version conflict; SQL confirmed exact receipt/version counts.
- Anonymous table/RPC access was rejected over HTTP. SQL privilege checks confirmed
  authenticated roles cannot invoke owner-parameter RPCs or select projects, and
  the service role cannot rewrite brief history.
- Both temporary fictional accounts and their records were deleted and cleanup verified.
  The schema remains installed. Keys stayed in process memory and were not printed.

The measured test portion took 4.6 seconds including CLI/network overhead; this is
not a product latency benchmark. Identity was injected by a test-only verifier, so
website login, end-user JWT validation, ChatGPT OAuth and hosted Workers remain
unverified. Docker is still unnecessary for these hosted tests and remains unavailable
for the full local Supabase stack. Full A44 is still pending.

## Original local foundation results

Local environment: macOS, Node 26.8.2, npm, Wrangler 4.147.0,
workerd 1.20261001.1, MCP SDK 1.32.1, Zod 4.6.5, PGlite 0.5.8.
CI targets Node 22; its configuration is added, but no remote CI run was performed.

| Check | Observed result |
| --- | --- |
| `npm run setup` | PASS: clean lockfile install, generated workspace ID/port configuration; no credentials required |
| `npm run typecheck` | PASS: generated Worker/Workflow types and strict TypeScript |
| `npm test` | PASS: 17 tests, zero failures/skips |
| `npm run build` | PASS: Wrangler dry-run bundle, Workflow binding present; no deployment |
| `npm run smoke` | PASS: workerd health/site, official MCP client initialize/list/diagnostic call, product tools unavailable, foreign-Origin rejection, local Workflow completion |
| `npm run check` | PASS: complete combined sequence after a clean setup |
| `npm run dev` | PASS: started on allocated port 55000; direct health and MCP initialize passed; fixture Workflow HTTP path returned 404. Server stopped after verification. |
| Migration + seed | PASS in fresh embedded PostgreSQL: all SQL applied, fictional accounts and brief loaded |
| Save/read/versioning | PASS: create, reopen, append version, preserved history, old receipt replay, stale update rejection |
| Failure atomicity | PASS: injected receipt failure rolls back project/brief; retry succeeds with original request ID |
| Ownership and privileges | PASS: cross-account read/write returns identical unavailable result; account-scoped IDs; suspended access denied; client roles denied; RLS hides rows even with SELECT grant; history cannot be rewritten by service role |
| Input/auth boundary | PASS: malformed input/ownership injection rejected, absent/expired/scope-deficient fixture credentials never reach storage, internal errors sanitized |
| Supabase adapter | PASS with intercepted HTTP fixture: RPC URL, verified account argument and bounded request; not a live network integration |
| Supabase CLI config/status/start | Config accepted, then BLOCKED: Docker daemon socket absent. No running containers or Supabase integration claim. |
| `git diff --check` | PASS |
| Original pack preservation | PASS: original references, numbered documents, diagrams and template unchanged from origin/main; README only gains the engineering entrypoint |

The SQL tests provide Supabase-like roles including default service-role grants,
then execute the actual migration. They test PostgreSQL behavior rather than an
in-memory JavaScript repository. PGlite serializes transactions: the repeated queued
requests test does **not** establish concurrent, separate-connection locking behavior.
Stage 2 A must test that through actual Supabase/Postgres connections.

Not verified or implemented here: hosted Workers, real OAuth, website sign-in,
ChatGPT connection/panel/handoff, full local/hosted Supabase and PostgREST, identity
mapping, production job dispatch/recovery/cancellation, cost/quota settlement, live
OpenAI generation or Lightreel. The Workflow smoke runs a deterministic fixture
step only. Full reference-pack A44 remains a later integrated gate.

To reproduce the verified suite: `npm run setup && npm run check`.
To unblock full local database setup: start Docker, then `npm run db:start` and
`npm run db:status`. No Stage 1 user input or paid credentials are needed for the
verified foundation; Stage 2 prerequisites are listed in the two assignments.
