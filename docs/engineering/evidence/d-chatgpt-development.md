# Saved Creator DNA — development ChatGPT proof

This increment connects authenticated saved-DNA reads and corrections to the existing
Kettle development plugin. It is not the live profile-to-script loop: provider scans,
research jobs, recommendations and script variants are still pending.

## Implemented path

- `get_creator_dna`: explicit stable DNA ID and optional historical version.
- `render_creator_dna`: same read operation, with `ui://kettle/creator-review-v1.html`.
- `correct_creator_dna`: current claim IDs, expected version and request ID; writes
  only user-requested corrections and preserves historical versions/receipts.
- Account identity comes from the existing JWT verifier and SQL identity mapping.
  Reads require `projects:read`; corrections require `projects:write`.
- Only the filtered `CreatorDnaView` reaches structured results, text fallback and
  the card. Raw scans and trusted ingestion are never public MCP tools.
- `contains_fixture_data` preserves fictional origin even when corrections or
  permissions remove all displayed observation evidence. Persisted fictional data
  is labelled separately from an unsaved local preview.
- Both browser entries are bundled by `build:panel` before checks/build/dev/smoke.
  No external card resources, direct provider requests or browser credentials.

## Verification and limits

`tests/creator-mcp.test.ts` exercises actual MCP requests, locally signed JWTs,
real migration SQL in PGlite, public projection, scopes, cross-account denial,
correction/replay/history and static resource delivery. Auth's signed identity SQL
suite and the browser bridge tests complement this. PGlite is not concurrent hosted
Postgres. A simulated parent-frame host is not actual ChatGPT.

Hosted migration/deploy and actual-host outcomes must be recorded separately below.

## Development fixture setup

Run only for the selected existing development account. This uses Supabase CLI access
and service credentials in memory; it creates no authentication bypass. It seeds a
fictional project and normalized authored fixture, with no provider/model call.

```
KETTLE_TEST_PROJECT_REF=fdicggstdtthfpcrpujf \
KETTLE_TEST_ACCOUNT_ID=<confirmed-connected-account-id> \
npx --no-install tsx scripts/seed-creator-chatgpt.ts --execute
```

`.context/creator-chatgpt-seed.json` retains the fixture inputs and request IDs for
safe exact retries. Do not copy it to another workspace or overwrite it to switch
accounts. No credential is written to this file. A successful seed is persistence
proof, not actual OAuth or live-provider proof.

## User acceptance sequence

1. Refresh the existing development plugin's tool catalog; reconnect if requested.
   Confirm `get_creator_dna`, `render_creator_dna`, `correct_creator_dna` are available.
2. Ask Kettle to show the seeded DNA ID using `render_creator_dna`. Expect an inline
   Creator DNA card, saved version 1 and an explicit fictional-test-data label.
3. Ask to correct a specific displayed trait. Kettle first reads current claim IDs,
   then calls `correct_creator_dna` with expected version 1 and a new request ID,
   and renders the saved result. Expect version 2 and `user_corrected` attribution.
4. Open another ChatGPT conversation with Kettle and ask for the same DNA ID.
   The correction and saved version must persist. Request version 1 to check history.
5. Repeat the read without displaying the card: full filtered output is available.
6. Optional separate authorized account: the same ID returns NOT_FOUND with no
   private evidence. An expired connection must request reconnect and clear the card.

No step starts a real scan or uses research credits. Keep the explicit DNA ID for
reopening; an account-scoped DNA listing/search operation is not implemented yet.

## Local integration evidence — 2026-10-09

The integrated tree passed `npm run check`: 156 TypeScript tests, 29 browser checks,
both TypeScript projects, Worker dry run and local workerd smoke. The development
environment dry run also passed. The browser expectations now distinguish saved
fictional records from local previews. PR #25's standalone CI lacked the lead-owned
bundle build entry; this integrated build supplies it and tests both artifacts.
Hosted and actual ChatGPT acceptance are not implied by these local results.
