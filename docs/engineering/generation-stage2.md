# Stage 2 B — generation and reference feasibility

Continuation: [bounded live-trial preparation and provider review](../../evals/STAGE2-HANDOFF.md)
reuses this harness, adds persistent local reservations, and records current access
blockers. The historical evidence below remains fixture/mock-only.

Recorded 2026-10-06. **Conditional go for a bounded description-only model trial;
no-go for production reference discovery yet.** The executable fixtures and mocked
OpenAI adapter pass locally. No model or reference-provider response has been
observed live. Hand-authored examples cannot establish generation quality, provider
coverage, freshness, latency, or cost per completed real script.

## Reproduce and inspect

```sh
npm run eval:generation
npx tsx --test tests/generation.test.ts
```

The first command has no live mode and rejects arguments. It assembles the fictional
B01 lamp, B02 silent mug, B03 meal planner and B05 old/revised bag outputs, compares
B01 description-only against one authored reference format, and records the B04
inaccessible-profile fallback. Inspect [inputs and sample scripts](../../evals/fixtures.ts)
and [individual recorded observations](../../evals/results.fixture.json).
Re-running replaces that fixture result artifact with fresh local timings.
Original references, diagrams, shared contracts and public tools are unchanged.

The five synthetic no-reference searches return successful empty results; the paired
lamp example uses just one authored reference. No eight-card padding, fabricated
views, media or transcripts. The reference URL and product-page URL are reserved
`example.com` fixtures, not fetched pages. B04 asks for a description/style example
and does not claim profile access. Creator workflows remain deferred.

## Personally verified behavior

The focused generation tests cover fixture provenance, sparse references and no-match,
permission gates before requests, input snapshots, brief-version/ID/language/duration
validation, canonical English silent constraints, structured idea plus script output,
untrusted-content prompt boundaries, invalid JSON/schema/refusal/incomplete output,
429 and 500 failures, bounded retries, request/body timeouts, oversized response bodies,
and one shared reservation budget across concurrent provider instances.

The [OpenAI adapter](../../packages/adapters/generation.ts) implements the existing
`GenerationProvider` seam and an evaluation-only `generateEvaluation` method returning
one structured idea (title, opening hook, rationale) with its script in the same call.
It requires explicit enablement, model, API key, shared budget and attempt reservation;
there is no chosen production model or default live execution. It requests strict
JSON Schema via Responses `text.format`, sets `store: false`, and checks results locally.
It has no tools, URL fetcher or runtime secrets/bindings. Reference content is serialized
as untrusted data, with permission approval supplied only by trusted server/operator
configuration. This matches the documented [Structured Outputs mechanism](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses);
no live schema/model-compatibility claim is made.

References with `needs_review` or `fixture_only` cannot enter the live adapter.
`evaluateReferenceLink` records the provided URL without fetching it, and returns a
content/permission fallback. Product facts and reference format notes remain separate.
The tests establish request isolation, not adversarial resistance of a real model.
Free-text constraint matching only covers canonical English silent/no-speech phrases;
other languages, subtle constraints, and factual truth require review. Every model
result is explicitly marked unreviewed. An authored negative sample adding “48-hour
battery life” passes structural validation but **fails factual review** because the
lamp's supplied facts do not support it. Review is an explicit separate gate in
[review.ts](../../evals/review.ts), not an automated truth detector.

B05 proves that each result remains tied to its original input and that the fixture
rejects a changed brief. It does not prove asynchronous active-result replacement:
that belongs to the later persisted job/result integration. No persistence or public
MCP generation tool was added.

## Fixture quality review

Agent editorial ratings of authored samples only, using the pack's 1–5 rubric.
These are not independent user ratings or measured model quality. Freshness rates
the authored concept's originality, not how recently a real reference was published.
All durations are estimates, not timed filming/speech observations.

| Sample | Relevance | Opening | Clarity | Filmability | Freshness | Facts / reference use | Main limitation |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Lamp, description | 5 | 3 | 5 | 5 | 2 | pass / pass (none) | Straight demonstration; weak distinctive hook |
| Lamp, authored reference | 5 | 3 | 5 | 5 | 3 | pass / pass (fixture only) | Empty-surface reveal adds staging, no proven user benefit |
| Silent mug | 5 | 3 | 5 | 5 | 2 | pass / pass (none) | Pleasant but generic ritual; no speech or faces |
| Meal planner | 5 | 3 | 4 | 3 | 2 | pass / pass (none) | Actual UI needed before filming; no automatic list claim |
| Bag, old/new versions | 5 | 3 | 4 | 4 | 2 | pass / pass (none) | Must verify objects fit; old version is historical only |
| Inaccessible profile | — | — | — | — | — | pass / pass (none) | Honest intake fallback; no script generated |
| Negative lamp battery claim | — | — | — | — | — | **fail** / pass (none) | Existing fact IDs do not validate an invented claim |

The paired lamp samples demonstrate how format notes can change staging while
preserving facts; they do not show that paid references outperform description-only
or plain ChatGPT. Real model repeats, blind user ratings, original outputs and user
edits, and a same-brief plain ChatGPT comparison remain outstanding. No adopted
quality or latency threshold is inferred from the reference pack's proposals.

## Measured timing and cost

The committed JSON retains every local observation with timestamp, Node/platform,
provider/model identity, attempts, input version and sample output. Initial fixture
run on macOS/Node 26.8.2 measured approximately 0.01–0.31 ms reference assembly and
0.03–0.54 ms script assembly/validation per sample, with 0.05–0.86 ms total.
These numbers measure local fixture playback only; no percentiles are appropriate
for six heterogeneous samples. Acknowledgement, first usable model idea, refinement,
network latency and real token usage are unobserved and represented as null where
applicable. Fixture model tokens and API cost are zero. Human authoring/review and
infrastructure allocation are excluded, not free.

Gustas authorized **$25 total across OpenAI, Lightreel, ScrapeCreators and EnsembleData,
including retries** during this work. Actual API spend: **$0**. Reserved: **$0**.
Remaining authorized allowance: **$25**. This does not authorize a subscription or
credit-pack purchase. No development API key was available to this assignment.
The connected Lightreel research tool was not called: a per-request credit/dollar
upper bound and content-use basis were not established.

[EvaluationBudget](../../packages/adapters/evaluation-budget.ts) supports a shared,
in-memory reservation ledger for one evaluation run. Every attempt consumes its
reservation, including failed/ambiguous attempts; default attempts = 1, maximum = 2,
with only explicit 429/5xx retried. Timeouts/network ambiguity are not retried. This
is **not hard billing enforcement**: the caller must establish a conservative bound
from current model pricing, bounded input, output cap and all charge components.
Before live work, reserve a portion of the remaining aggregate cap with the lead;
all provider clients must share the same run ledger and reconcile billed/usage costs.
The ledger is not persistent or account-wide and does not cover another process's
spending. The fixture CLI intentionally cannot enable live work from environment
variables. Actual model costs remain null in adapter observations; nominal
reservations are never presented as billed costs.

## Provider evidence: documented, not observed live

Official pages were read on 2026-10-06. Vendor claims and examples are not Kettle
measurements. None establishes Kettle's right to store, display, cache or send all
third-party content to a model.

| Candidate | Documented capabilities and limits | Evidence gap / disposition |
| --- | --- | --- |
| Lightreel | `POST /v1/chat` research; `response_fields` requests up to five string/array fields. Replies contain `conversationId` and `answer`. The documented “transcript” endpoint retrieves **research chat history**, not a guaranteed video transcript. Calls may take minutes and consume normal plan usage. [API docs](https://lightreel.ai/docs) | No guaranteed video-record schema, metric timestamps, transcript coverage or normalized per-reference costs verified. Research relevance/freshness unmeasured. Keep as candidate; first require a bounded price and permitted sample. |
| ScrapeCreators | TikTok video info examples include metadata, media addresses and engagement counts. [Video endpoint](https://docs.scrapecreators.com/v2/tiktok/video/). Separate transcript endpoint costs one credit; optional AI fallback adds ten credits and supports videos up to two minutes. [Transcript docs](https://docs.scrapecreators.com/v1/tiktok/video/transcript/) | More directly inspectable metadata/transcript endpoints than Lightreel's answer interface. Availability and relevance still unmeasured; disable AI fallback until explicitly budgeted. |
| EnsembleData | TikTok post-info accepts a URL; bulk lookup supports up to 100 IDs. [Post guide](https://ensembledata.com/guide/guides/tiktok/post-info/). Search/metadata endpoints have unit costs; listed trial is 50 units/day, Wood is $100/month for 1,500 units/day. [Pricing](https://ensembledata.com/pricing) | No new subscription within this trial. Use only already-authorized access with endpoint units bounded. Exact transcript coverage/charges need endpoint-level confirmation; no live coverage or relevance evidence. |
| User reference link | Our local intake accepts a URL and separately supplied permitted format notes/content without fetching. | URL presence is not permission. Default to description-only or request a permissible excerpt; never infer product facts from an inspiration reference. |

ScrapeCreators' [pricing page](https://scrapecreators.com/) lists $47/25,000 credits;
that is $0.00188 per credit before yield, retries and other costs. It is a nominal
unit conversion, **not cost per usable reference** and exceeds the present total cap
as a new purchase. The [caching documentation](https://docs.scrapecreators.com/caching/)
needs checking alongside actual response metadata before treating cached metrics as
fresh. Promotional freshness/response-time claims are not observations here.

## Permission register and next experiment

- **Lightreel:** [terms](https://lightreel.ai/terms) explicitly separate content access
  from permission to republish/commercially reuse it. Storage, display, caching and
  model-processing of actual reference material remain needs-review.
- **ScrapeCreators:** [terms](https://scrapecreators.com/terms) assign third-party terms
  compliance to the customer and prohibit IP infringement; technical extraction
  establishes no blanket reuse approval. They also reserve possible credit expiry,
  despite the pricing page's “never expire” language; do not infer contractual credit
  guarantees from marketing. All four Kettle content uses remain needs-review.
- **EnsembleData:** [terms](https://ensembledata.com/terms-and-conditions) limit API use,
  prohibit directly competing services and disclaim data accuracy. A license to access
  the API does not resolve Kettle's content display/cache/model-processing rights.
  All four uses remain needs-review.
- **Authored fixtures:** original synthetic text only, no external assets or copied
  transcripts; permitted in this repository's tests. `fixture_only` is deliberately
  retained and rejected by the live adapter.

Next: select one explicit structured-output-capable OpenAI model, make a development
key available through local secrets, establish its worst-case request cost, reserve a
small part of the existing $25 cap, and run description-only B01–B03 plus revised B05
repeatedly before spending on references. Then test the same lamp brief with an
owner-supplied reference whose storage/display/cache/model uses are documented. Keep
raw allowed outputs, usage, attempts and failures and rate relevance/freshness/coverage
per result. Divide all search/enrichment/retry costs by **usable permitted references**,
and all journey costs by completed acceptable scripts; zero usable items means cost
per usable item is undefined, not zero.

Remaining inputs: model selection (or permission for an engineering selection),
development OpenAI key; approved good/bad scripts and real briefs; plain ChatGPT
comparison outputs or supported access; provider credentials/available credits and
per-call ceilings; specific permitted reference content and usage/retention basis.
No additional spending cap is requested: $25 is already authorized. Full discovery,
job orchestration, durable accounting, multilingual constraint enforcement and
customer/pilot approval remain later integration work.
