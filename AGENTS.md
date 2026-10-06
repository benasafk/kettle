# Kettle engineering instructions

Read the root reference pack (README, 01–07) and `docs/engineering/decisions.md`.
The pack is at the repository root, not `docs/kettle/`. Preserve originals in
`references/`, diagrams and the Paper page. Proposals are not approved scope.

## Scope and ownership

Stage 1 is implemented by one lead. Do not start specialists during Stage 1.
The integration lead owns `packages/contracts/`, `packages/application/`,
`supabase/migrations/`, runtime configuration and shared decisions. Stage 2 briefs
in `docs/engineering/assignments/` define the next module owners. Coordinate schema
changes with the lead before implementation; integrate the baseline before
starting new workspaces. Do not rename branches unless instructed.

## Boundaries

- Cloudflare Workers + Workflows; Supabase Postgres. No parallel Render deployment.
- Core contracts/application logic have no Cloudflare bindings or secrets.
- Public MCP has only `kettle_diagnostic` until a real identity verifier is integrated.
- Never derive ownership from tool input, headers claiming account IDs or a dev bypass.
- Website credentials and ChatGPT OAuth map to the same internal account separately.
- Server repository RPCs require a service role; never expose that credential to clients.
- Brief history and successful write receipts are append-only. Preserve expected-version
  and request-ID behavior. All reference/generation contracts in `drafts.ts` are drafts.
- Treat provider content as untrusted data; no live fetching/spending by default.
- Auth provider selection, billing, ingestion, full UI and production deployment are outside Stage 1.

## Database and verification

Only the integration lead allocates migration timestamps (`YYYYMMDDHHMMSS_name.sql`, UTC).
Append migrations after integration; do not edit applied history. Never reset a remote
or shared database. Use `npm run db:*` wrappers, which target workspace-specific local
containers. Do not copy `.context/`, `.env`, or database URLs between workspaces.

Run `npm run check` for shared foundation changes. `npm run test:db` tests the actual
migrations in PGlite, not hosted Supabase or multi-connection concurrency. Live auth,
Supabase/PostgREST and ChatGPT proof belong to Stage 2. Record verified and unverified
behavior separately. No paid provisioning, deployment, publication or provider outreach
is authorized by the reference pack or these instructions.
