# Stage 2 A — Authentication and persistence

**Outcome:** two fictional development accounts can sign in on the website, connect
Kettle in ChatGPT through OAuth, save a description-only project and reopen it through
a hosted Worker MCP endpoint. A second account cannot read or mutate the first account's data.

Start from the integrated Stage 1 commit and contract v1.0.0. Read the root reference
pack, `AGENTS.md`, `docs/engineering/contracts.md` and the verification report.

## Owned modules and shared boundaries

Own `apps/web/`, `apps/worker/` HTTP/auth/tool registration, a new `packages/auth/`,
`packages/database/`, and auth integration tests. Add only a minimal panel proof under
`apps/panel/` if needed for the host journey. Coordinate runtime/workflow changes with B.
The lead owns shared contracts/application behavior and migration ordering; propose
new issuer-subject mapping migrations through the lead. Do not replace v1 inputs or
add an alternate owner/version/idempotency mechanism.

Implement `IdentityVerifier` for real server credentials. All website/MCP product
operations go through `createOperations`. `createSupabaseRepository` supplies the
server-only HTTPS RPC seam. No `account_id` tool input or fake auth switch is allowed.

## Work

1. Evaluate Supabase Auth against current ChatGPT requirements: protected-resource
   and authorization metadata, PKCE S256, resource/audience binding, supported OAuth
   client registration/identification, exact host-provided redirect, scopes, refresh
   and revocation behavior. Record observed evidence. Use Auth0 if the measured gaps
   justify it; website sign-in alone does not settle the choice.
2. Add unique `(issuer, subject)` → internal account mapping and safe provisioning.
   Do not link accounts by unverified email. Website session and MCP token must map
   to the same account; implement website CSRF/session handling separately.
3. Register the three v1 tools with input/output schemas, scope/security metadata,
   proper auth challenges, read/write annotations and usable text responses.
4. Prove Supabase RPC save/read with development credentials; verify SQL grants,
   ownership filters and failures through the real network path.
5. Test the private ChatGPT connection and a truthful website handoff using the
   actual supported development route. Do not invent a published listing URL.

## Acceptance and evidence

- A01/A23 subset: website login and actual ChatGPT OAuth resolve the intended account;
  declining connection grants nothing and creates no duplicate project.
- A02/A05/A13: description-only save, correction to version 2, later-chat retrieval.
- A10/A11/A15/A16: stale saves, retries with identical/different payloads, simultaneous
  duplicate writes over separate database connections, guessed IDs across accounts,
  missing/wrong issuer/audience/expired/revoked tokens and missing scopes.
- Anonymous and normal Supabase client roles cannot call owner-parameter RPCs or read
  tables; a browser/panel never receives the service role key. No fixture auth can
  be enabled in the deployed Worker.
- `npm run check` passes. Record development URLs, sanitized transcripts, schema
  changes, actual token lifecycle behavior and database timing. Never commit secrets.

This proves the auth/database portion of A44. Generation Workflow retry, pending
dispatch reconciliation and quota settlement require a subsequent integrated job
slice; do not label full A44 passed based on the Stage 1 fixture workflow.

## Dependencies, credentials and limits

Needs a running Docker daemon for local Supabase; development Supabase and Cloudflare
access for hosted proof; an OAuth development project (Supabase first, Auth0 if needed);
two fictional users and a ChatGPT account/workspace supporting private MCP connections.
Obtain the development endpoint/callback configuration from the actual host UI.

No purchases, production deployment, public listing, billing or real-user migration.
Before hosted execution, have the user authorize the specific development deployment
and any costs. Default external spend is $0 until an explicit test budget is supplied.
Deliver a reviewable commit, an evidence matrix and remaining provider constraints.
