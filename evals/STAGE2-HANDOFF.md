# Stage 2 B continuation — 2026-10-06

## Lightreel connection update — 2026-10-09

The user supplied a Lightreel credential and requested connecting systems first.
The credential is stored only in this workspace's Git-ignored `.env.lightreel`
with owner-only file permissions. Do not copy it to other workspaces or commit it.
Earlier statements below about missing Lightreel credentials are historical.

Verified one authenticated `GET https://api.lightreel.ai/v1/chats`: HTTP 200.
Response contents were discarded without logging or persistence. This establishes
accepted authentication for that endpoint, not reference quality, profile coverage,
research availability or a measured billing charge. No `POST /v1/chat` research
request was submitted. The aggregate research-budget coordination remains open.

Repeat the read-only check locally with:

```sh
node --env-file=.env.lightreel scripts/lightreel-check.mjs
```

The script uses a fixed provider URL, refuses redirects, times out after 20 seconds,
does not retry and suppresses response/error bodies. The connection is local only;
no Worker secrets, public tools or deployments were changed. Other providers remain
unverified. Endpoint and Bearer authentication follow the
[Lightreel API documentation](https://lightreel.ai/docs), checked 2026-10-09.

## Historical evaluation status

**Conditional go for the prepared description-only trial; live quality remains
unverified. No-go for production reference discovery.** This continuation reused
the existing fixture harness and OpenAI adapter. No paid provider request was made:
the process has no provider keys, the workspace contains example environment files
only, and no secret-manager reference was supplied. The connected Lightreel research
tool exists but its account-specific request ceiling is unknown; it was not invoked.
The user subsequently confirmed that Bangkok has no configured generation/reference
credentials or documented secret-manager reference either. Credentials are expected
through the process environment; nothing was copied from another workspace.

## Reproduce and inspect

```sh
npm run setup
npm run check
npm run eval:generation
node --import tsx evals/run-live.ts --preflight
# Only with a development OPENAI_API_KEY already in the process environment:
node --import tsx evals/run-live.ts --live
```

The existing fixture command remains fixture-only. The separate live command accepts
exactly `--live`; no environment variable can silently enable paid execution. It
uses B01, B02, B03 and revised B05 twice (eight samples), with zero references and
no tools. B03 reuses the fictional supplied fact as description text, removing its
example URL. B04 remains an honest inaccessible-profile fallback. Existing
`fixture_only` reference permissions are not promoted to live approval.

- [Fixture outputs](results.fixture.json): six authored scripts and B04 fallback,
  regenerated locally; timings are fixture assembly/validation only.
- [Preflight](results.preflight.json): exact inputs, model, pricing basis and missing
  credential status; **not** a model response.
- [Live plan](live-plan.ts), [runner](run-live.ts) and
  [aggregate reservations](live-reservations.jsonl): inspectable execution controls.
- A future live run writes `evals/live-results/<run-id>/`: the input plan,
  bounded original response JSON (including incomplete output), validated output,
  sanitized failure, HTTP status, attempts, token usage, elapsed generation time,
  usage-based cost estimate and pending editorial review. Failures stop the batch.
  No percentile, user acknowledgement or first-usable-idea timing is inferred.

## Budget and model selection

The single authorization remains **$25 total across all four providers**, including
retries. Executed provider requests: **0**. Recorded provider spend: **$0**.
Reserved: **$0**. Unreserved allowance: **$25**. No subscription, credit purchase,
free-trial activation or provider outreach occurred. Local computing/review and
existing infrastructure costs are excluded from provider spend.

Before any paid run, coordinate the remaining **aggregate** balance and the proposed
batch with the Bangkok lead. The prepared $4 batch is a maximum future reservation,
not an allocation already spent or a separate provider allowance. This workspace
rechecked `OPENAI_API_KEY`, `LIGHTREEL_API_KEY`, `SCRAPECREATORS_API_KEY` and
`ENSEMBLEDATA_API_KEY`: all absent. Only `.env.example` and `.dev.vars.example` exist
locally. No secret values were printed and no authenticated provider call was made.

Engineering trial selection: `gpt-4.1-mini-2025-04-14`, a pinned non-reasoning model
documented to support Responses and structured output. It is an inexpensive initial
feasibility sample, not a claim that it is the best current model. Published rates
checked on 2026-10-06: $0.40/million input tokens and $1.60/million output tokens;
context limit 1,047,576 tokens. [Official model documentation](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

Conservative per-attempt ceiling:

```
(1,047,576 input tokens × $0.40 + 2,400 output tokens × $1.60) / 1,000,000
= $0.4228704; round up to a $0.50 reservation.
8 attempts × $0.50 = $4.00 maximum reserved for the first batch.
```

The entire context is charged as uncached input, plus the output cap, deliberately
overcounting the small fictional inputs and schema. The adapter requests standard
service tier, no tools and `store: false`. There are no automatic retries in this
trial, even though the underlying adapter has bounded retry support. Pricing must
be rechecked before execution on another UTC date; the runner fails closed then.
If model access fails, it does not silently substitute another model.

The local ledger is locked across processes and fsynced before each request.
Reservations survive restarts and are never automatically released, including
timeouts and ambiguous failures. Missing, malformed or partial ledger history fails
closed. A leftover lock after a crash requires manual process/spend reconciliation;
do not delete the ledger or restore an older Git version to regain budget. All
later provider tests must reserve against this same history. This is local trial
accounting, not an account-wide billing control or production quota system.

Usage-derived estimates charge all reported input at the uncached rate; they are
not invoices. Raw responses retain cached-token details for later reconciliation.
Incomplete model responses now retain their reported usage, rather than losing it
during completion validation. Unknown costs remain covered by reservations.

`LiveBudgetLedger.recordBilledCost` appends an actual USD charge and non-secret
receipt reference against an existing reservation. Use provider receipts only;
never promote a token-price estimate to actual billing. Duplicate/orphan entries
are rejected. The snapshot reports known billed costs and unreconciled reservations
separately; total billed cost remains null until every reservation is reconciled.
Lower actual costs do not release reservations. Any actual charge above its reserved
bound freezes new reservations until the bound is reconciled with Bangkok. Unit
tests use fictional receipts in temporary directories; the real ledger is empty.

## Reference candidates: documentation evidence only

All pages below were checked on 2026-10-06. No candidate returned a live Kettle
reference, transcript, metric or timing measurement during this continuation.

| Candidate | Documented capability / cost | Disposition |
| --- | --- | --- |
| Lightreel | Research answers via `POST /v1/chat`; up to five requested string/array fields. Chat-history retrieval is not video-transcript coverage. API draws normal plan usage and may take minutes. [API](https://lightreel.ai/docs). Published Pro price is $199/month, with trial terms. [Pricing](https://lightreel.ai/pricing). | Connected research action is available, but no account-specific credit/dollar maximum is established. Do not initiate paid research yet. No new plan authorized. |
| ScrapeCreators | TikTok [video metadata](https://docs.scrapecreators.com/v2/tiktok/video/) and [transcript](https://docs.scrapecreators.com/v1/tiktok/video/transcript/) each list one credit. Transcript AI fallback adds ten credits; keep it disabled. [Pricing](https://scrapecreators.com/) lists $47/25,000 credits and free starting credits. | Best documented candidate for a small, explicit permitted-video enrichment trial. Two one-credit calls nominally equal $0.00376 at that pack rate, before retries; this is not an account-specific dollar bound or usable-reference cost. Verify existing balance, rate and disabled auto-recharge first; do not buy a pack. |
| EnsembleData | [Post lookup](https://ensembledata.com/guide/guides/tiktok/post-info/) supports supplied posts. [Pricing](https://ensembledata.com/pricing) lists 50 daily trial units, a $100/month Wood plan, and two units for post information. | Candidate for metadata coverage once existing access is available. Do not divide a monthly plan by theoretical maximum units and call that measured marginal cost. Exact endpoint/account unit costs and transcript availability need verification; no subscription authorized. |

ScrapeCreators documents `cached`, `cached_at` and `credits_charged`; cache hits may
cost zero, but cache misses spend the normal endpoint credits. `cache_max_age` is
not a “cache only” spending guard. A future observation must distinguish retrieval
time from the cached data's age. [Caching](https://docs.scrapecreators.com/caching/).

No specific third-party material is approved here for storage, display, caching or
model processing. Lightreel explicitly distinguishes access from reuse rights.
ScrapeCreators assigns third-party compliance to the customer; its terms also
describe optional auto-recharge. EnsembleData's API-access license does not settle
content reuse. These are permission dependencies, not claims that every permissible
use requires a new license. [Lightreel terms](https://lightreel.ai/terms),
[ScrapeCreators terms](https://scrapecreators.com/terms),
[EnsembleData terms](https://ensembledata.com/terms-and-conditions).

## Quality review and comparison limits

The existing [fixture review](../docs/engineering/generation-stage2.md#fixture-quality-review)
still applies: authored samples score well on relevance and clarity, but their hooks
and originality are modest. On inspection, the lamp's three-setting demonstration
is feasible with locked exposure; the silent mug stays hands-only without speech;
the meal planner needs actual UI confirmation; bag staging must avoid implying
unverified capacity. These are agent editorial observations of authored text,
not model-quality measurements or creator approval.

The fixture runner now embeds those editorial ratings and reasons directly in
`results.fixture.json`. Each review is bound to a SHA-256 digest covering the input,
idea, reference material and script. A change to any reviewed content produces a
pending review with no ratings; it cannot inherit the old approval. This is a
staleness check, not automated factual grading. All six current authored outputs
have matching reviews. No minimum-quality release gate is implied by these scores.

The existing paired lamp samples show different staging with an authored reference,
not an observed improvement from paid references. The battery-life negative sample
still demonstrates that valid fact IDs do not prove a claim. No live output receives
a quality score in this report because none exists.

For each eventual live sample, review the raw and validated outputs together; rate
relevance, opening, clarity, filmability and freshness 1–5, then independently pass/
fail factual integrity and reference use. Check no-face/no-speech, practical shot
timing, all product claims, missing facts and brief version. Preserve originals and
record edits separately. Two repeats are directional, not a population benchmark;
no acceptance threshold has been adopted.

Next comparison requires one explicitly permitted reference on the same lamp brief,
with a documented storage/display/cache/model-processing basis. Evaluate description
and reference conditions blindly where possible. Divide all retrieval/enrichment/
retry costs by usable permitted references; with zero usable items the result is
undefined. Plain ChatGPT output, approved real briefs and user ratings are still
missing. Do not use this coding conversation as a measured plain ChatGPT baseline.

## Verification and lead handoff

HEAD contains `335354f`. The original branch is preserved:
`gustasbull/git-npm-setup-check`. Setup passed with zero reported vulnerabilities;
npm emitted install-script approval warnings without blocking checks. Baseline
checks passed with 41 tests; the continuation adds five tests for restart-safe shared
reservations, locking/corruption, description-only cost bounds, credential/CLI guards,
and incomplete-output usage capture.
Final `npm run check` passed with **46 tests**, TypeScript, dry-run Worker build and
local workerd smoke. `npm run eval:generation`, live preflight and `git diff --check`
also passed. These checks do not establish live model/API/schema compatibility,
reference coverage, billed cost, model quality or real-user acceptance.

Subsequent fixture/accounting continuation: `npm run check` passed with **49 tests**,
TypeScript, dry-run build and local smoke. Fixture evaluation and no-network preflight
passed again. The three added tests cover review staleness, actual-cost reconciliation
across restarts, and over-bound billing halting further reservations. Live generation
and ingestion remain unexecuted pending access, permissions and Bangkok spending
coordination. This change is ready for PR review as local evaluation preparation.

Changes are limited to adapters, generation tests, evaluation artifacts and this
report (plus a link from the earlier generation report). No shared contracts,
dependencies, runtime configuration or database files were changed, so no shared
change awaits coordination with the bangkok lead. Production discovery orchestration
remains outside this work. The live proof is still blocked on a locally configured
development credential; reference proof additionally needs bounded existing access
and specifically permitted material. The $25 authorization does not need renewal.
