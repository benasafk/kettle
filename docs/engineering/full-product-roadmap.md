# Full-product roadmap and creator-loop placement

Bangkok planning update, 2026-10-09. Full product remains the user's objective.
The 26 journeys in the root reference pack and the Paper designs are the coverage
baseline; unresolved choices are still decisions, not silently approved behavior.
The creator-loop pilot is a proposed integration milestone within this roadmap.
This document does not authorize spending, deployment or submission.

## Milestones

1. **Existing foundation:** authenticated development website/MCP, account mapping,
   versioned project briefs and the project-review card. Prior combined checks passed
   83 tests and two browser suites; hosted card proof exists, and CSP-enabled operation
   was subsequently user-reported. Remaining hosted auth lifecycle checks are open.
   This is recorded history, not a fresh Oct 9 deployment audit.
2. **D — Creator recommendation loop:** bounded TikTok scan, correctable DNA,
   permitted references, recommendations, selected idea, filmable variants, durable
   save/reopen. See the [integration brief](assignments/D-creator-recommendation-loop.md).
3. **Complete creation and library workflows:** description/product intake, Instagram
   coverage, own-idea and pasted-script entry, richer revisions/variants, history,
   Vault, export, project management and the remaining Paper surfaces.
4. **Complete account/commercial/operational workflows:** lifecycle, billing and
   entitlements, quotas, support, export/deletion, monitoring and recovery. These can
   advance alongside creation work where shared contracts permit.
5. **Full acceptance and submission:** every adopted journey has tested success,
   failure and recovery behavior; provider rights/quality/cost and production/release
   requirements are verified. A target date alone does not pass this gate.

## Journey coverage and ownership

“D slice” means partial contribution, not completion of the whole journey.

| Journeys | D contribution | Remaining full-product work | Primary owners |
| --- | --- | --- | --- |
| F01–F04 entry, return, recovery | Reuse existing auth and account mapping | Complete onboarding/return routing and hosted lifecycle checks | Auth, Integration |
| F05 intake | TikTok profile scan and correctable context | Description/product/reference inputs, supported Instagram coverage and fallbacks | Generation, Backend, UI |
| F06 creator/founder | Creator DNA slice | Founder-specific behavior and full project-type support | Backend, Generation, UI |
| F07–F08 own idea/pasted script | No mandatory dependency on discovery | Dedicated intake, preservation and revision routes | Backend, Generation, Integration |
| F09 brief changes | Bind batches to versioned context | Downstream invalidation/reuse choices and clear user recovery | Bangkok, Backend, UI |
| F10–F12 discovery/refinement/selection | Reference corpus, ranked recommendations and explicit selection | Full refinement, filters, more-results behavior and broader discovery | Generation, Backend, UI |
| F13–F14 revision/variants | Initial two or three variants | Targeted edits, candidate acceptance, silent/no-face/translation behavior | Generation, Backend, UI |
| F15–F16 history/export/filming | Durable script versions and self-reported filming measurement | Undo/conflict UX, full export and persisted filming state | Backend, Integration, UI |
| F17–F18 Vault/projects | Saved selection/script and reopen | Vault browsing/bookmarks, switching, rename/archive/delete lifecycle | Backend, UI |
| F19 Explore | Reusable permitted classification foundation only | Explore experience and reuse permissions; outside pilot, retained on roadmap | Generation, UI |
| F20 job lifecycle | Durable start/status/result, bounded retries/recovery | Full cancellation/resume and consistent commercial usage settlement | Bangkok, Backend, Billing |
| F21–F22 billing/limits | Development spend accounting only | Adopted pricing/trial, subscriptions, webhooks, limits and retained-work access | Billing, Auth, Bangkok |
| F23–F24 disconnect/data lifecycle | Existing auth acceptance work informs D | Verified disconnect, export, deletion/retention and job effects | Auth, Backend, Release |
| F25 help/feedback | Capture pilot feedback and safe errors | Support owner, user help and traceable feedback | Release, UI |
| F26 chats/devices/text | D requires later-chat reopen and text fallback | Complete supported-surface/device acceptance across all flows | Integration, UI, Release |

## Decisions and sequencing

Bangkok owns shared schema/application/migrations/runtime and merges. Generation
owns provider feasibility; Backend owns assigned persistence/job implementation;
Auth owns identity/lifecycle; UI and Integration use separate component/bridge file
boundaries; Billing & Release owns commercial/operational readiness. Exact assignments
and merged interfaces precede concurrent edits. No new workspace is created by this plan.

Next integration PR is D0: schemas and fictional fixtures for scan/observation,
DNA versions, taxonomy, recommendation batches, selection, scripts and jobs; reviewed
operation/state-machine definitions; storage/permissions and cost-accounting design.
Do not promote the current `drafts.ts` by assumption. Generation can prepare a sanitized
tracked evidence handoff independently; live runs wait for access, permission, bounded
run allocation and authoritative budget reconciliation.

Open owner/product decisions include recommendation/variant labels, sample/corpus
limits, KPI windows and thresholds, quality standard, supported input/platform depth,
commercial terms, retention/deletion, candidate acceptance and late-job behavior.
Engineering proposals in D are reviewable defaults, not claims these are resolved.

Maintain fixture, local-runtime, operator-observed hosted and user-reported evidence
separately. No social access proof establishes backend integration or media reuse
rights; no card mock establishes a complete ChatGPT journey. The next schedule should
be based on this coverage and dependencies, not the earlier reduced-scope Friday estimate.
