# Generation owner report to Bangkok

## Branch and integration

Inspected the working tree before making changes: clean, branch
`gustasbull/git-npm-setup-check-v2`, HEAD `c4487f2`, no unmerged local commits.
Earlier generation commits `196ba59` and `5a3c1da` are already integrated through
PR #3. Fetched origin and fast-forwarded to `7203fad`; no reset or branch rename.
Read updated decisions and the Milestone C project-review-card brief.

Milestone C does not require generation changes. This work remains in generation
adapters, tests and evaluation evidence. UI, MCP registration, shared contracts,
application logic, dependencies, migrations and runtime configuration belong to
the other owners/Bangkok. No merge or deployment will be performed here.

## Remaining live evaluation and credentials

No development provider credentials are configured in this workspace's process.
The following local paths are absent (values were neither read nor displayed):

- `/Users/gustas/conductor/workspaces/kettle/malabo/.env`
- `/Users/gustas/conductor/workspaces/kettle/malabo/.env.local`
- `/Users/gustas/conductor/workspaces/kettle/malabo/.dev.vars`
- `/Users/gustas/conductor/workspaces/kettle/malabo/.dev.vars.development`

No secret-manager reference is documented or supplied. No credentials or `.context`
files were copied from Bangkok. Development access must be supplied locally through
the process environment or an approved secret-manager reference, never chat values.

Before live calls, Bangkok must identify the authoritative spending ledger and
confirm this batch's allocation against the remaining **$25 aggregate cap across
all providers and workspaces**. The committed `evals/live-reservations.jsonl` is
local evidence only; it cannot prove that another workspace has not spent money.
An empty local ledger is not a new $25 allowance. No live invocation is authorized
by this report alone, and no new allocation has been recorded.

After access/allocation: recheck current pricing/model availability, run the bounded
description-only batch, retain original outputs and usage, review quality, and
reconcile actual receipts with Bangkok. Reference comparison additionally requires
explicitly permitted material and an approved accessible provider with a verified
request-cost bound. Do not activate subscriptions or purchase credits.

## Proposed experiment (pending allocation, not executed)

- Model: `gpt-4.1-mini-2025-04-14`, retaining the existing engineering proposal.
- Batch: B01 lamp, B02 silent mug, B03 meal planner and revised B05 bag, twice each.
- Eight text-only requests; no references, tools, link fetching or automatic retries.
- Maximum output: 2,400 tokens/request; timeout: 60 seconds; stop on first failure.
- Proposed reserve: $0.50/request, **$4 maximum total**, within the global cap.
  The earlier documented full-context bound is $0.4228704/request. These are dated
  planning estimates, not a current pricing recheck or observed billing.
- Quality: relevance, opening, clarity, filmability and freshness scored 1–5;
  factual integrity and appropriate reference use reviewed separately. Check silent/
  no-face constraints, unsupported claims, brief versions and plausible filming time.
  No owner-approved production pass threshold or plain ChatGPT comparison exists yet.
- Record each attempt, generation latency, returned model identity, input/output
  tokens, usage-derived estimate and actual receipt separately. Do not infer
  percentiles, acknowledgement timing or model quality from fixture playback.

## Focused local continuation

Two evidence-handling fixes, exercised with mocked requests only:

1. A network failure on a retry now reports no HTTP status instead of retaining the
   previous attempt's 500 status. Both attempts remain reserved.
2. If writing the local response artifact fails, already-received token usage is
   retained in the failure observation. The adapter neither retries nor refunds it,
   and the local error detail remains sanitized.

The existing fixture harness is preserved. Current editorial reviews apply only
when input, idea, reference material and script hashes match. Authored reference
material remains fixture-only; no ingestion provider is enabled by these changes.

## Evidence and spending

Verification on the `7203fad` baseline plus this change: `npm run check` passed
with **55 tests**, TypeScript, dry-run Worker build and local workerd smoke.
`npm run eval:generation`, offline live preflight and `git diff --check` passed.
The fixture output changed only in timestamps/timings; all six editorial review
hashes still match. No hosted or live-provider verification is claimed.

- Fixture results: six authored scripts plus B04 inaccessible-profile fallback;
  see `results.fixture.json`. These are not observed model outputs.
- Mock HTTP results: regression tests exercise retry/recording failure paths without
  provider access. Token values in those tests are fictional.
- Live generation/reference observations: none.
- This workspace's actual provider spend: **$0**. Reservations: **$0**.
- Global remaining balance and authoritative ledger: **awaiting Bangkok confirmation**.
  The approved global cap remains $25, not $25 per workspace or provider.
- Blockers: credentials, global allocation/ledger coordination, reference permissions
  and bounded provider access. Real briefs/user quality calibration remain missing.

This report is delivered in the focused PR for Bangkok; no direct cross-workspace
agent messaging capability is available in this session.
