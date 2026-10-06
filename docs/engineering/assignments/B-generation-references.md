# Stage 2 B — Generation and reference feasibility

**Outcome:** determine whether useful, filmable scripts can be generated from a
description-only brief, and whether a reference provider adds enough value to justify
its access limitations, latency and cost. Supply executable fixtures and evidence;
do not build the full discovery product.

Start from the integrated Stage 1 baseline and v1 brief schema. Read the root
`05-acceptance-and-evaluation.md` B01–B05, the source/permission decisions and Stage 1
verification. A and B can proceed independently once the baseline is shared.

## Owned modules and shared boundaries

Own `packages/adapters/`, new `evals/` and reference/generation tests. Draft
`GenerationProvider`, `ReferenceProvider`, `ScriptDraft` and `ProviderResultDraft`
are the evaluation seams. Propose changes to `packages/contracts/drafts.ts` through
the lead; do not silently freeze them into public tools or migrations. A owns the
MCP/auth wiring. Coordinate Workflow changes through the lead after feasibility.

## Work and acceptance

1. Build deterministic fictional fixtures for lamp, silent mug, meal planner,
   inaccessible profile and changed brief. Keep fixture provenance obvious. No URLs,
   transcripts, views, permissions or claims may be fabricated as live observations.
2. Implement a server-side OpenAI adapter behind `GenerationProvider`, using an
   explicitly selected model and structured output validation. It must work with no
   references. Keep the runnable default fixture-only and paid calls opt-in.
3. Evaluate Lightreel's actual available fields, permitted access/storage/display/
   generation uses, cost, limitations and fallback. Do not infer permission from a
   URL or successful API response. If access is unavailable, deliver a documented
   feasibility gap and fixtures; do not scrape or contact the provider on the user's behalf.
4. Cover no-match, missing media/metrics, timeout, rate limit, malformed model output,
   untrusted source instructions, retry bounds and input-version preservation.
   No-match is a successful empty result; no forced eight-card padding.
5. Evaluate spoken lines, shots, on-screen text, estimated duration, language and
   fact/reference IDs. A silent brief must not gain spoken lines. Unsupported business
   claims fail factual review. Structural validation alone is not a factual guarantee.
6. Produce a reproducible evaluation command, fixture outputs and a compact evidence
   report with quality ratings using the pack's rubric. Compare description-only and
   permitted-reference outputs on the same brief; include a plain ChatGPT baseline
   when user-provided examples/account access make that possible.

Report observed acknowledgement/generation/reference/total latency, input/output
usage, model/provider/version, attempts, measured or estimated cost and missing cost
components. Separate fixture data from live measurements. Use percentiles only with
enough samples; retain individual observations. Price, quality and latency thresholds
remain proposals until Gustas adopts them.

Relevant checks: A03/A04/A07/A09/A18 and source/quality portions of A44. `npm run check`
must keep passing. No production job lifecycle, billing, quota settlement or full UI
is part of this assignment. Deliver adapters, tests, reproducible measurements and a
go/conditional-go/no-go recommendation with the evidence behind it.

## Dependencies, credentials and limits

Fixtures can begin immediately without A or credentials. Live tests need a development
OpenAI API key, selected model and user-approved spending cap; provider credentials
and an established permission basis for any live references. Use secrets outside Git.
Default live budget is $0 until the user sets a cap; count retries inside that cap.
Request a few approved good/bad scripts and real briefs for creative calibration.
Do not provision services, contact providers, publish or deploy as part of this task.
