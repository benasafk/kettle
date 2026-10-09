# Milestone D — Creator recommendation loop

Prepared by Bangkok, 2026-10-09. **Planning proposal; implementation gates below
remain open.** The user explicitly relayed Generation's context for incorporation.
Subsequent user direction authorizes starting collaborative implementation. The
[kickoff assignments](D/README.md) activate bounded independent work; live-run gates
remain unchanged. Shared contracts still require their own reviewed baseline.
This brief does not authorize live calls, spending, deployment, provider outreach,
or new access. It supplements Stage 2 B and fits within the
[full-product roadmap](../full-product-roadmap.md); it does not replace that scope.

## Direction and bounded outcome

User direction: accept linked public TikTok/Instagram profiles, identify relatively
strong videos, derive initial profile/audience context, and personalize improvements.
Generation reports this as local, uncommitted C12. This brief records the relayed
direction without claiming that commit is integrated or editing the root originals.

The supplied pilot is: TikTok URL → approximately ten recent videos → correctable
Creator DNA → Lightreel discovery + ScrapeCreators enrichment → shared creative
classification → eight personalized recommendations → selected idea → two or three
ready-to-film variants. Instagram remains in the product roadmap, with its own
coverage/acceptance work rather than an assumed identical adapter.

The first engineering proof is deliberately smaller: **one approved TikTok profile,
a bounded corpus, saved/correctable DNA, and up to three evidence-backed recommendations**.
Three useful recommendations is the proof target; fewer/no matches must be truthful
and explain limitations. Eight is the later pilot target, never a padding requirement.
The pilot corpus target of 100–500 relevant videos per creator/category follows
coverage, relevance, permissions and cost evidence; it is not the initial fetch limit.

No full social OAuth, large crawlers, millions of videos, platform-wide real-time
trends, causal attribution, automatic posting, analytics dashboard or finished AI
videos are included in D. These pilot exclusions do not silently remove separately
documented full-product flows. Nor does “full product” approve every excluded feature.

## Evidence received, not independently reverified by Bangkok

| Report from Generation | Planning interpretation |
| --- | --- |
| Lightreel authenticated `GET /v1/chats` returned 200; body discarded; no research POST | Authentication reachability only; no retrieval, quality, permissions or billing proof |
| ScrapeCreators global Codex MCP enabled with OAuth status | Developer tool access only; no verified live profile result or backend integration |
| Thirteen official research skills installed | Development capability, not deployed product functionality |
| No raw ScrapeCreators key in Generation process; backend provider/model credentials unverified | Backend credential/access gate remains open |
| No research spending reported for this handoff | Does not establish an authoritative aggregate remaining balance |
| Oct 9 docs report incomplete TikTok pagination, omitted pinned Instagram Reels, caption detail requests, country-only TikTok audience at 26 credits/request | Reported limitations to verify before the relevant live run; do not assume complete coverage or free audience enrichment |

Source document remains in Generation's `.context/attachments/7qK3cd/` and is not
copied. Reported local `scripts/lightreel-check.mjs`, `evals/STAGE2-HANDOFF.md` and C12
are uncommitted there; request a tracked, sanitized handoff through a PR before reuse.
Do not copy `.context`, environment files or credentials between workspaces.
Provider documentation references supplied by Generation:
[Lightreel](https://lightreel.ai/docs),
[ScrapeCreators MCP](https://docs.scrapecreators.com/integrations/mcp/).

## Data and inference requirements for lead-owned contracts

These are requirements for a subsequent reviewed contract PR, not frozen schemas
or names for public tools. Existing `drafts.ts` remains draft-only.

- Identify profiles/videos by platform plus stable platform user/video ID. Preserve
  supplied and canonical URLs; handles and URLs alone are not stable identity.
- Keep account-owned profile associations, scans, DNA, recommendation batches and
  scripts isolated. A public social URL establishes neither ownership of that profile
  nor entitlement to another Kettle account's records.
- Store immutable, dated provider observations for URLs, captions, post dates,
  views, likes, comments, and available shares, duration and follower count. Missing
  values stay unknown, never zero. Preserve conflicting observations with provenance.
- Record requested/returned counts, pagination boundaries, covered dates, exclusions,
  unavailable/deleted media and provider errors. “Last ten” is a sample target, not
  proof of a complete profile. Rank within comparable age/format/platform cohorts;
  small samples and metric age limit conclusions. Do not claim causation.
- Track source, retrieval time, permitted uses and retention restrictions separately
  from metrics. No permission is inferred from technical access. Default to metadata
  and source links; storing/reusing media needs its own established basis.
- DNA versions cover topics, formats, hooks, showcase, CTA, structure, duration,
  pacing and relative performance patterns. Each claim needs evidence IDs, method,
  uncertainty and whether observed, inferred or user-corrected. Label inferred audience
  traits; geography alone does not establish demographics or intent. Visual/pacing
  claims require actual permitted video evidence, not captions or thumbnails alone.
- Corrections append DNA versions using expected-version and request-ID semantics.
  Recommendation batches bind exact profile, DNA, brief, taxonomy and observation
  versions so later corrections cannot silently change prior outputs.
- Shared taxonomy: hook text/type/visual/duration; showcase; CTA; structure;
  pacing/shot frequency/time to reveal/payoff; topic/subtopic. Unknown is supported.
  Store classifier version and evidence; deduplicate before classification/search.
- Ranking considers creator fit, relative performance, niche relevance, recency and
  diversity. Weights are an evaluation proposal, not validated scientific scoring.
  Each recommendation explains concept, personal fit, dated reference evidence,
  execution and limitations; selection records the exact batch and idea.
- Variants include hook, opening visual, script, shots, B-roll, on-screen text,
  showcase timing, CTA, estimated duration and pacing. Proposed labels are
  **Reference-led / Creator Fit / Experimental**, replacing “Proven” until justified.
  Scripts preserve fact/reference lineage and append-only versions.

## Delivery gates and merge order

| Gate | Deliverable | Exit evidence |
| --- | --- | --- |
| D0 — Shared baseline | Bangkok contract/state-machine proposal, permission/credential checklist, bounded run plan, budget ledger and fixture seam | Reviewed and merged shared definitions; explicit profile/sample/call limits and run allocation before live work |
| D1 — Profile scan | TikTok adapter and normalized observations; missing/private/partial profile handling | One permitted bounded live scan with stable IDs, dated metrics, coverage, latency and cost evidence; fixtures reported separately |
| D2 — Creator DNA | Grounded analysis plus authenticated save/read/correct operations | User correction survives reopening; unsupported visual/audience claims absent; stale writes and second-account access rejected |
| D3 — Reference corpus | Lightreel candidates → ScrapeCreators enrichment → deduplication/classification/search | Relevant small corpus with provenance/permissions, no duplicate enrichment spending, honest missing-content behavior |
| D4 — Recommendations and variants | Up to three proof recommendations, selection, two or three filmable variants, durable scripts | Human quality review, evidence traceability, factual checks, saved selection/version consistency; then evaluate eight-card pilot target |
| D5 — ChatGPT integration | Authenticated start/status/result/select/generate/save operations; focused cards and full text fallback | Actual profile-to-script journey, interruption recovery, narrow/light/dark/CSP checks, later-chat reopen and account isolation |
| D6 — Pilot evaluation | Selection/script/filming/relevance events plus latency and spend reporting | Adopted denominators/windows/thresholds, measured outcomes and a decision about scaling corpus/platform coverage |

UI may work against merged fictional fixtures while adapters/backend progress. No
public tool names or new scopes are fixed by this document. Bangkok reviews tool
contracts and metadata before registration. Starting a paid job must be explicit;
status, card refresh and reopen must never silently start research or regeneration.

Reuse Workers + Workflows and Supabase. Lead-owned design covers job dispatch gaps,
pending/running/terminal states, bounded retries, cancellation, leases/concurrent
workers, resume, stale input versions and late completions. Save durable intent before
dispatch and reconcile failures. Use account-scoped request receipts and provider-call
attempt records; an ambiguous provider timeout must not blindly trigger another paid
call. Reserve spending before calls and settle actual/estimated cost; preserve unknown
charges until reconciled. Do not promise exactly-once external billing without provider
support. Failed attempts cannot erase successful results or append-only history.

## Ownership and workspace boundaries

| Owner | Next responsibility and boundary |
| --- | --- |
| Bangkok | `packages/contracts/`, `packages/application/`, migrations, runtime/Workflow integration, shared dependency/build decisions, budget allocation, review/merge/deployment coordination |
| Generation | Provider-specific adapters, normalization/classification/ranking/generation evaluation and sanitized provider evidence under `packages/adapters/`, `evals/`, dedicated tests; no changes to auth/database adapters owned elsewhere |
| Product Backend | Propose persistence/RPC implementation and job tests against lead-owned contracts; Bangkok allocates migrations and integrates application changes; exact file assignment must precede implementation |
| Auth & Accounts | Identity/scope/isolation acceptance and lifecycle work; coordinate MCP edits rather than overlapping Integration |
| UI | Focused DNA, recommendation and script components/styles/fixtures; no auth, provider networking or duplicated business schemas |
| ChatGPT Integration | Host bridge, resources/tool wiring and actual-host evidence after shared contracts; coordinate shared `apps/worker/mcp.ts` ownership through Bangkok |
| Billing & Release | Cost/usage acceptance, operational/release checklist; commercial entitlements remain distinct from development research budget |

Use existing workspaces where practical. The subsequent kickoff activates specialists
through their assigned briefs. Do not alter their branches from Bangkok. Merge D0 before dependent implementation; preserve
uncommitted specialist work. Deliver small PRs with owned files, input commit, evidence
type, unresolved dependencies and next integration point. Specialists do not independently
merge, deploy, change secrets/configuration or apply hosted migrations.

## Live-run and evaluation gates

The existing **$25 aggregate cap across providers, including retries, remains shared**.
This handoff assigns $0 of new spending. Bangkok must reconcile reported/actual charges
and outstanding reservations into one authoritative ledger before allocating a run.
Unknown cost is not free; report credits and their verified dollar basis separately.
Credentials stay in approved local ignored files or Worker secrets, never browser cards,
chat, fixtures or logs. Developer MCP OAuth is not automatically usable by the backend.

Before live execution, record approved profile URL, access/use basis, provider/model,
hard page/video/candidate/call limits, retry limits, estimated maximum cost, allocation,
stop conditions and sanitized evidence destination. Country audience enrichment is a
separate opt-in expense, not part of the default profile scan. Choose the initial model
and verify backend access before forecasting quality/cost.

Primary KPI proposal: unique eligible pilot users selecting at least one recommendation
divided by unique eligible users shown a successful nonempty batch, within an adopted
window. Also report all-started funnel completion, empty/failing batches and coverage so
the selection denominator does not hide failures. Secondary measures: script generation,
self-reported filming, relevance ratings, per-stage latency, total journey cost and
published performance against a comparable baseline without causal claims. Windows,
eligibility, sample size and pass thresholds require adoption before evaluating results.

Required failure cases: inaccessible/partial profile, no matches, missing media/metrics,
rate limit, malformed/untrusted provider/model content, exhausted budget, ambiguous paid
timeout, duplicate requests, stale DNA/brief, concurrent selection/save, cancelled/failed
job and cross-account access. `npm run check` is required for shared implementation;
hosted/provider/ChatGPT evidence remains separate from local fixtures. Completion of
this planning brief is not evidence that any D gate has passed.
