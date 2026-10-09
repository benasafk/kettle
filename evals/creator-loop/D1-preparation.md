# D1 preparation: provider evidence and offline characterization

2026-10-09, Malabo / Generation. Input baseline: `706002f` (`origin/main`).
Existing branch `gustasbull/git-npm-setup-check-v3` fast-forwarded from `c173646`;
no reset, rename or stash. Existing C12, Lightreel check and handoff changes survived.
They are preserved in a separate handoff commit for lead review. This does not
overwrite Bangkok's engineering decision or freeze D0 contracts.

## Delivered now

- `packages/adapters/creator-scan/scrapecreators-characterization.ts`: internal,
  provider-shaped parsing and bounded replay of mocked HTTP observations. No
  transport, environment access, credentials, fetch, model or production wiring.
- `evals/creator-loop/fixtures.ts`: authored fictional IDs, captions and metrics;
  no downloaded media, real profile, copied response or attachment.
- `tests/creator-scan.test.ts`: missing versus zero metrics, string identity,
  conflicting duplicate observations, empty pages/cursors, unknown/stalled pagination,
  private profiles, malformed/oversized payloads, author mismatch, rate limits and
  ambiguous failures. One replay attempt per page; no retries; hard maximum three
  pages and fifty unique videos. These are test bounds, not approved live limits.

Returned shapes are internal characterization evidence, not normalized scan/DNA
schemas or a public API. The helper is imported only by its tests. Unknown fields
are discarded; captions remain untrusted data, with no visual analysis inferred.
Malformed rows are counted and excluded, not silently repaired into zero metrics.
Duplicate IDs retain all admitted observations rather than overwrite earlier counts.
No exhausted feed is called an exhaustive profile. Page body limit is 256 KiB;
per-page item limit 500. A real streaming transport/body/time/cost policy waits for
the next increment. Raw provider duration units are deliberately not normalized yet.

## Preserved authentication evidence

| Provider | Observation | Still unverified |
| --- | --- | --- |
| Lightreel | Before kickoff, one authenticated `GET /v1/chats` returned HTTP 200; body discarded, no research POST. Local ignored owner-only credential file; no secret in Git. Preserved `scripts/lightreel-check.mjs` can repeat the check but was not run under this kickoff. | Backend/Worker access, research output, field usefulness, coverage, latency, actual billing and content-use basis. |
| ScrapeCreators | Before kickoff, global Codex MCP configured at `https://api.scrapecreators.com/mcp`; CLI reported enabled and `auth_status=o_auth`. Thirteen official research skills installed. | Successful tool/data retrieval and backend credentials. OAuth status is not a verified profile result; no raw API key supplied to this workspace process. |
| OpenAI | Existing adapter and evaluations are fixture/mock-only in recorded workspace evidence. | Current backend credential availability, live model output and quality/cost. No credential audit or provider request made during this kickoff. |

Do not copy environment files or `.context` between workspaces. Development agent
MCP configuration does not supply deployed Kettle credentials. The earlier root
C12 edit is user-direction context, not authorization for live ingestion.

## Provider documentation, not live observations

Public documentation/specification GETs only during this preparation; no authenticated
provider API calls, research, media retrieval or account mutations.

| Endpoint | Documented unit information / limitations |
| --- | --- |
| ScrapeCreators `/v1/tiktok/profile` | Sample response charges 1 credit; profile metadata only. `user.id` is a string, `uniqueId` is the handle; `stats.followerCount` may be unavailable in our fixtures. |
| `/v3/tiktok/profile/videos` | Successful page costs 1 credit, including empty filtered pages. Provider shape uses `aweme_list`, `aweme_id`, `author.uid`, `statistics.*`, `max_cursor`; keep region/sort/pinned settings fixed across pagination. A feed can omit public posts even after pagination; missing does not mean deleted. Official example lacks `has_more`: replay stops as `pagination_unknown` rather than guessing. |
| `/v1/tiktok/video/transcript` | Sample response charges 1 credit; optional AI fallback adds 10. Current spec says existing transcripts can cover any length; only AI fallback has a two-minute limit. This corrects earlier blanket transcript-duration shorthand. No fallback is enabled here. |
| `/v1/tiktok/user/audience` | 26 credits/request; countries only. Not default scan scope or proof of demographics/interests. |
| Lightreel `/v1/chat` | Research uses normal plan usage and can take minutes; up to five requested string/array fields. No verified account-specific request ceiling. `/v1/chat/:id` retrieves research conversation history, not a video transcript endpoint. |

Specs checked 2026-10-09:
[profile](https://docs.scrapecreators.com/v1/tiktok/profile/openapi.json),
[feed](https://docs.scrapecreators.com/v3/tiktok/profile/videos/openapi.json),
[transcript](https://docs.scrapecreators.com/v1/tiktok/video/transcript/openapi.json),
[audience](https://docs.scrapecreators.com/v1/tiktok/user/audience/openapi.json),
[Lightreel](https://lightreel.ai/docs).
Credits are provider units, not a verified dollar conversion or cost per usable video.
Cached observations need their source age retained, not relabelled as freshly observed.

Permissions questions for D0/live planning: permitted access, storage, display,
model processing, media download/reuse and retention for the specific chosen profile
and references. An accessible URL/API response proves none of these by itself.
Provider content remains untrusted and must not change execution instructions.

## Spend and reservation reconciliation

Historical workspace reports (`evals/BANGKOK-HANDOFF.md`, `evals/STAGE2-HANDOFF.md`,
`docs/engineering/generation-stage2.md`) report no live generation/reference requests
and $0 provider research spend. This report covers those earlier **recorded** runs
as well as this conversation; it is not an independent invoice audit. No live-results
directory is present and `evals/live-reservations.jsonl` has zero entries. Reported
research spending/reservations remain $0; this kickoff adds zero provider calls or
reservations. The prior Lightreel authentication GET's actual billed charge is
**unknown**; no invoice/usage receipt was inspected. Unrecorded activity and other
workspaces' charges cannot be established from this evidence. Aggregate remaining
balance stays unknown pending Bangkok reconciliation. The $25 cap is shared and
this kickoff allocates $0; an empty local ledger grants no spending authority.

## Exact shared type needs for Bangkok's D0 (proposals, not exported schemas)

1. **Profile identity/association:** platform and string native ID; supplied and
   canonical URLs; current handle; verified Kettle account association kept separate
   from claimed social ownership.
2. **Video identity:** platform/native video ID and author ID, URL and nullable
   caption/publication time/duration with explicit units.
3. **Immutable observation/provenance:** observation ID, provider/endpoint, retrieval
   and source/cache time, nullable metrics including genuine zeros; permissions and
   retention basis; retain conflicting observations by stable video identity.
4. **Scan coverage/result:** requested/returned/unique/rejected counts; pagination
   boundaries and stop reason; private/inaccessible/unknown/partial states; immutable
   input version and observation IDs. Exhausted feed is not complete-profile proof.
5. **Attempt/cost evidence:** attempt identity, outcome including ambiguous timeout,
   nullable credits and billed dollars, separate reservation/estimate/receipt fields;
   upstream D0 budget/operation boundary owns retries and authorization.
6. **DNA evidence/version:** claim IDs pointing to observations, observed/inferred/
   user-corrected method and uncertainty, unknown visual fields, taxonomy/classifier
   version, expected-version and request-ID semantics. No DNA implementation yet.

Blocker: merged D0 contracts/fixture seam are required for normalized outputs and
DNA. Live D1 exit proof additionally waits for explicit authorization, permitted
profile, bounded call plan, backend access and budget allocation. No shared types,
application/migrations, runtime/dependencies, auth/database adapters or UI changed.

## Verification

Focused command: `node --import tsx --test tests/creator-scan.test.ts` — 9 passed.
Final `npm run check` passed: 92 TypeScript tests, two browser suites, TypeScript,
dry-run Worker build and local workerd smoke. `git diff --check` passed.
An initial bare `npx tsc --noEmit` found the newly integrated panel's generated bundle
absent. The first wrapper run exposed stale local dependencies (missing ext-apps).
`npm ci` restored the existing lockfile without changing dependencies or tracked files.
This is fixture/local verification only, not hosted/provider/ChatGPT evidence.

Dependency review for Bangkok: `npm audit --json` reports three high-severity entries
in the existing development-tool chain `wrangler → miniflare → sharp`, tied to
GHSA-wq5f-xc86-pv6w. The audit proposes Wrangler 4.149.0; this is not an evaluated
upgrade recommendation. No dependency edits or `audit fix` were made because
dependency ownership remains with the lead. Installation also reports existing
install-script approval warnings. These do not establish a production exploit or
block the offline characterization, but should be reviewed by Bangkok.
