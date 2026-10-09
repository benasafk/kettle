# Creator pipeline provider adapter evidence

Implementation only, integrated on `d8b7b5d` (merged PR #27). No live provider execution, spending,
deployment, credential copying or account mutation is authorized by this change.
The earlier `D1-real-provider-proof-plan.md` remains a separate local planning draft.

## Official documentation inspected 2026-10-09

- [Lightreel](https://lightreel.ai/docs): bearer-authenticated `POST /v1/chat`
  returns `conversationId` and `answer`. Structured answer fields allow string/array
  types, up to five fields. `GET /v1/chat/:id` returns history, not a video transcript.
  Research can take minutes and consumes normal account usage. The docs do not
  establish an asynchronous pending/completed job schema. Preserve a returned ID;
  bounded history reads cannot recover an unknown ID after an ambiguous POST.
- [ScrapeCreators profile](https://docs.scrapecreators.com/v1/tiktok/profile/openapi.json):
  `x-api-key`, handle lookup; provider-native IDs remain strings; missing metrics
  remain null. Optional cached responses identify `cached_at`; retrieval time is
  not assumed to be observation time.
- [ScrapeCreators feed](https://docs.scrapecreators.com/v3/tiktok/profile/videos/openapi.json):
  `sort_by=latest`; keep region, pin policy and cursor chain consistent. The feed
  can omit posts; neither exhaustion nor missing items proves complete inventory
  or deletion. Empty successful pages can still cost one credit.
- [ScrapeCreators detail](https://docs.scrapecreators.com/v2/tiktok/video/openapi.json):
  `aweme_detail`, `get_transcript`, `download_media`. Media download can cost ten
  credits: explicitly disabled. No media fetching or paid transcript fallback.
- [OpenAI structured output](https://developers.openai.com/api/docs/guides/structured-outputs):
  Responses `text.format` with strict JSON schema; incomplete/refusal output must
  be handled explicitly. Model output still requires shared contract and lineage
  validation. A schema-valid result does not prove semantic faithfulness.

The installed ScrapeCreators skill was used for endpoint routing; the official
per-endpoint documents take precedence where their details differ.

## Nonsecret readiness and budget evidence

| Reference | Evidence | Still unverified |
| --- | --- | --- |
| `LIGHTREEL_API_KEY` | Previously stored in ignored local `.env.lightreel`; historical `/v1/chats` auth GET returned 200 | Current validity, trial expiry/timezone, remaining usage, backend provisioning, historical GET charge |
| `SCRAPECREATORS_API_KEY` | Development MCP OAuth was configured; user reported 100 credits | REST credential provisioning, current remaining credits, endpoint billing/account limits |
| `OPENAI_API_KEY` | No credential accessed or copied for this work | Runtime credential, selected model access, pricing and run allocation |
| Shared provider budget | Previously stated aggregate $25 cap | Actual balance, reservations and spend across workspaces |

A reported three-day Lightreel trial and 100 ScrapeCreators credits do not allocate
this run. Unknown costs stay unknown, including transport errors and ambiguous POSTs.
No balance endpoint or authentication probe was called during this implementation.
Only unauthenticated official documentation pages were retrieved.

## Implementation boundaries

All tests use injected fetch and authored fixtures. Any `origin: live` assertions in
unit tests exercise the live mapping path using synthetic responses; they are not
proof of actual provider access. No credentials are needed to run the tests.

Source content is inert data. No media analysis, visual/pacing claims, real audience
measurement or causal success claims are introduced. Existing corrected DNA belongs
to the application; adapters consume the selected current version and do not
replace user corrections with a fresh analysis during recommendation generation.

## Shared seam and bounds

Integrated merged PR #27 at `d8b7b5d`; consumes `CreatorPipelineProvider`,
`CreatorProviderContext`, `RecommendationBatch`, `CreatorScriptSet`, `FilmingVariant`
and the existing creator-profile envelopes. No shared schema, application, migration,
runtime or dependency changes. Script JSON schema derives from the shared variant
schema, with IDs/envelope metadata supplied by the adapter rather than the model.

Factory: `createCreatorPipelineProvider(options)` in
`packages/adapters/creator-pipeline/provider.ts`. Required inputs are injected fetch,
ScrapeCreators and Lightreel backend credentials supplied by trusted composition
(never environment lookup in this module), an optional OpenAI backend credential, an explicitly selected model/token ceiling/region, approved
source permission policy, and `canProcessDna`. The latter has no permissive default:
the lead must resolve stored evidence for the exact captured DNA ID, snapshot ID and
version, including user-corrected claims, before authorizing external processing.
The callback is synchronous; resolve storage permission before constructing the
job-scoped predicate. A public display view cannot establish those rights. Source
policy is a separate trusted input; runtime must scope it to the allocated job's
sources and honor retention. No public input may set either permission mechanism.

- Scan: at most one profile GET and two feed GETs; reject requested bounds over ten
  videos/two pages. Latest order, fixed injected region, exclude pinned posts.
  No retry, region fallback or detail fetch for the seed video. Supplied video URL
  canonicalization is pure; the lead intake retains the seed independently of feed
  completeness. The published scan port still accepts a canonical profile URL.
- Research: exactly one blocking POST; preserve its `conversationId` in the durable
  receipt. Default zero history reads; explicitly configurable zero to three, each
  requiring its own guarded attempt. Unknown ID/malformed response stops. A known
  ID without a usable answer stops after the configured reads; no resubmission.
- Enrichment: zero to three distinct TikTok detail GETs, no transcript/media calls.
  Validate requested native video ID and handle against returned identity.
- Scripts: one OpenAI Responses POST, selected idea and captured DNA version only;
  at most 8,000 configured output tokens. Reject incomplete/refused, malformed,
  duplicate-label and unknown-reference output. No automatic repair call or fallback.
- HTTP: fixed endpoint hosts/paths, no redirects, 256 KiB response bound, streaming
  cancellation/deadline and sanitized errors. Defaults: 30s ScrapeCreators, 180s
  research, at most 30s per history read, 60s model. Each configured request timeout
  is positive and capped at ten minutes. Input JSON is capped at 24KB for research
  and 48KB for generation. These are engineering limits, not spending allocations.

Every request runs inside the lead's `context.call`. Keys are `profile`, `feed:0/1`,
`research`, `poll:0/1/2`, `video:<native-id>`, `generate`; the durable guard must scope
keys to a job/captured immutable inputs, reserve cost first and block ambiguous
attempts. The adapter supplies **no production guard implementation**.

The closure returns an allowlisted receipt `{id,status,body,retrieved_at,latency_ms,
failure:null,source_observed_at}`. `body` is a JSON string containing only selected
provider fields: credits/cache time and admitted metadata, research ID/candidate URLs,
or structured model output and token usage. No auth headers, media URLs, remaining
account balance or raw diagnostic errors are retained. Receipt validation repeats
after guard replay. Provider failures throw `CreatorProviderError` with a safe code
and optional HTTP status; they never establish zero cost. A later-page failure stops
the job; earlier successful receipts remain in the lead guard for reconciliation,
not an invented complete scan. Replay derives stable result IDs from receipt IDs.

Dollar costs are unknown. Scan envelopes retain supplied credit counts and null USD;
research/model receipts do not invent conversion rates. Lead guard accounting must
apply its approved ceilings and reconcile actual usage. It must not infer free
requests from a successful HTTP response, cached flag, or missing usage.

The current `PipelineReference` cannot carry the complete `VideoObservation`
provenance or cost envelope. Durable receipts retain the source metadata; reference
limitations disclose cache observation time or unknown freshness. Do not confuse
retrieval time with the time at which views were measured. This is a projection
limitation, not a second reference schema.

## Grounding and remaining dependencies

Recommendations use Lightreel discovery and enriched captions matched to current
topical/audience DNA claims. Keyword overlap is deliberately conservative, only
English, and can return no ideas. It is not semantic ranking or proof of quality.
The existing DNA analyzer recognizes a small English topic vocabulary; a creator
outside it may need topical DNA corrections before useful recommendations emerge.
Suggestions are explicitly proposed executions; captions do not establish visual
formats, actual audience traits or pacing. Script source IDs are validated against
the selected idea; prompts include corrected DNA, selected references and uncertainty.
Human review is still required to detect semantically unsupported generated claims.

Remaining lead work: durable attempts/budget/concurrency/reconciliation, exact
snapshot permission resolution, trusted secret/model composition, seed retention,
job persistence/runtime/MCP and UI integration. Live gates remain credential access,
trial/credit/budget reconciliation, permissions and separately allocated execution.
The unit-test guard is an in-memory fake only; it does not prove production durability.

## Reproduction

```sh
node --import tsx --test tests/creator-pipeline-http.test.ts tests/creator-pipeline-normalization.test.ts tests/creator-pipeline-provider.test.ts
node --import tsx evals/creator-loop/run-provider-http.ts
npm run check
```

Focused adapter tests: 22 passing (plus two existing lead contract tests when using
the wildcard). The offline evaluator returns one sampled video, one enriched
reference, one idea and two script variants via five synthetic guarded requests;
it explicitly reports zero live provider requests. Full `npm run check` passed: 180 TypeScript tests and 29 browser tests, plus
build and local smoke. A final receipt-sanitization assertion brings the dedicated
adapter count to 23; it and typechecking pass after that small hardening change. No hosted or actual ChatGPT verification is claimed.

## Optional backend generation credential follow-up

Scan/recommend construction no longer requires `credentials.openai`. ScrapeCreators
and Lightreel credentials remain required. `generate` rejects an absent OpenAI key
before permission processing, guard reservation or HTTP; it never substitutes a
sentinel credential or another model/provider. ChatGPT browser access is not an
OpenAI backend credential. The existing configured OpenAI generation path remains.

Injected-mock coverage proves scan/recommend success without OpenAI and zero guard
or HTTP calls when generation is requested without it. Credential requirement tests
also retain rejection of missing ScrapeCreators/Lightreel keys. No live provider
tests, paid requests, upgrades or runtime/contracts changes accompany this follow-up.
