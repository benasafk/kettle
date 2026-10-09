# D0 — Shanghai creator-loop UI inventory and acceptance proposal

Prepared 2026-10-09. **Design evidence and proposed presentation boundary only.**
This completes Shanghai's [start-now assignment](../assignments/D/ui.md), not D0's
executable-contract gate or D1–D5 implementation. Bangkok and Berlin are the review
recipients. No production component, bridge, shared schema or fixture schema is added.
Existing project-review code is preserved.

## Input and safe synchronization

- Inspected branch `gustasbull/chatgpt-ui-v1` at `6a9c917`; working tree was clean.
- Fetched origin and fast-forwarded that same branch to kickoff
  `706002f6c73ba3f1f1a431165e1b332d4720e198`. No reset, rename or stash.
- Read AGENTS.md, root README/01–07, engineering decisions, the D kickoff/UI/Integration
  briefs, [Milestone D](../assignments/D-creator-recommendation-loop.md), and
  [full-product roadmap](../full-product-roadmap.md).
- Source baseline is the kickoff commit above. This PR's head contains this inventory;
  its exact commit is recorded in the PR handoff. No live provider/model calls,
  spending, credentials, hosted account changes, deployment or Paper edits occurred.

## Paper evidence and mapping

Inspected [Kettle · Core workflows](https://app.paper.design/file/01M39TTB7DKFHZY2JVDMAEDZ81/p-5-0)
read-only on 2026-10-09. File `01M39TTB7DKFHZY2JVDMAEDZ81`, page `p-5-0`, token hash
`79b59143`. Node references below are engineering lookup keys, not product labels.
The page has eight artboards; core flows are in `EJT-0`, recovery in `NTY-0`, Vault in
`S80-1`. Other boards are light foundations and discovery visual alternatives.

| D surface | Existing design nodes / inspected structure | Reuse and explicit gap |
| --- | --- | --- |
| Profile scan / progress | `EQB-0` “2A — Preparing your recommended video”, inner `OGI-0`; `X9F-0` “1.5V · Analysing your video”, inner `X9L-0`; proposed account/video route `YP1-0`, output `YPE-0` | Reuse compact heading, step and secondary explanation. These are recommendation/video progress examples, not a complete bounded profile scan. Requested/returned counts, coverage dates, exclusions, cancellation and ambiguous-timeout states need proposed additions. |
| Correctable Creator DNA | `P9O-0` creator profile illustrative example; `O0P-0` “1.5B · Context review · conditional”, inner `O17-0`; `O48-0` inline edit detail | Creator context has Project, Creates, Audience, Goal, Output and correction-through-chat copy. Reuse labelled rows. No dedicated evidence-linked DNA traits, method/uncertainty, saved version, correction pending or conflict comparison found. Those are proposed additions, not an existing DNA editor. |
| Inaccessible / partial input | `RRZ-1` “2B·C-3 — Can't see the account”; `RRH-1` limited-description example; `YB2-0` / `YB3-0` transcript-only analysis; recovery `NUV-0` unknown style | Preserve description fallback and explicit unavailable visuals. Description-based traits must stay user-supplied/inferred, not observed profile results. New partial profile coverage presentation is needed. |
| Recommendations | `RD7-1` “2B·C — Creator · next video discovery”; body `RD9-1`, lead recommendation `RMX-1`, explanation/script `RMY-1`, alternatives `RDA-1`; proposed wireframe `YPX-0`, cards `YRB-0` | Reuse concept, fit explanation, dated reference and next action. Paper shows illustrative metrics and eight-result language. D proof shows actual zero–three results; eight remains the pilot target without padding. No live/performance claim follows from this artwork. |
| Selection / generating alternative | `RMZ-1` Open in Studio / Save actions; `OH9-0` “2D · Alternative generation”; `OHQ-0` “2F · Generation failed” | Separate selecting an exact batch/idea from explicitly requesting generation. Preserve previous complete script during pending/failure. Paper's ready top script is conditional on actual ready data; it is not permission to auto-generate. |
| Script / variants | `OJV-0` Studio, body `Q0G-0`, script `Q2G-0`; `Y3N-0` Studio after choosing reference; `FYL-0` no-talking example; `FYD-0` Keep mine / Use new | Reuse Hook / Main content / CTA and time, spoken text, on-screen text, shots. No dedicated two/three-variant comparison or variant-specific version/conflict screen found. Proposed labels: Reference-led / Creator Fit / Experimental; never “Proven”. |
| Empty, saved, recovery | `OHG-0` no strong match; `LCY-0` empty filter; `OHY-0` preview unavailable; `OGZ-0` and `YBB-0` saved; Vault `T2N-1` leaving mid-script | Distinguish successful no-result, local empty filter, source unavailable, failed generation and failed save. Durable script existence and Vault bookmark are separate states; exact save/reopen policy awaits D0. |

`YP1-0` is literally labelled “Next steps · wireframe proposal”. Its automatic
analysis-to-recommendations note is not an adopted paid-job policy. D requires an
explicit start; status, reopen, correction and refresh must never silently spend.
The current 1.5B title differs from the older Milestone C title; this inventory does
not reinterpret or modify the existing saved-brief component.

Evidence method: `get_basic_info`; tree summaries for core, recovery, Vault, creator
recommendation, script and wireframe subtrees; page-wide text searches for DNA,
variant, profile and conflict; inline JSX for `OGI-0`, `P9O-0`, `RMY-1`, `YRB-0`,
`OH9-0`; computed styles for `P9O-0`, `OGI-0`, `RMX-1`, `Q2G-0`; Kettle token export.
DNA/variant/conflict text searches returned no matches. This supports “not found in
this inspection”, not proof that differently named artwork cannot exist. Source
screenshots of the creator-context card and proposed three-step wireframe were
visually inspected: clear spacing and hierarchy at their designed widths, but no
narrow/dark or interaction acceptance can be inferred from static artwork.

### Values read from JSX/styles/tokens

| Role | Observed value | Implementation consideration after D0 |
| --- | --- | --- |
| Compact context/progress surface | 24px padding/radius, 16px gap; `#FAFAFD` base; gradient `linear-gradient(in oklab 145deg, oklab(100% 0 0) 0%, oklab(98.8% .0001 -0.004) 48%, oklab(95.5% 0.004 -0.011) 100%)` | Do not hard-code 640px width; fit host container. |
| Surface shadow | `#FFFFFF 0px 1px 0px inset, #4A4B6810 0px 2px 4px, #57516F1C 0px 18px 42px` | Light-only source; dark adaptation needs review. |
| Creator context rows | 100px labels, 16px gap, 10px vertical padding; 14/22px text; title 24/30px weight 700; system-ui | Stack labels in narrow containers; preserve full text. |
| Progress | Title 22/28px weight 600; body 14/22px; 8px track | The exported 64% fill is illustrative. Use indeterminate status unless authoritative measurable progress exists. |
| Recommendation | Outer 20px padding, 24px gap/radius; content gap 12px; hook 28/34px weight 650, tracking -.02em | Bricolage Grotesque display and DM Sans body are Paper choices. Font assets/build approval belongs to Bangkok; system fallback requires no download. |
| Script sections | 126px label column, 14px gap; spoken text 16/24px; directions 13/20px | Stack into labelled shot blocks on narrow cards, retain semantic reading order. |
| Actions | Minimum height 44px; 12px radius; primary base `#316CE4`; secondary `#EAF0FC` / `#294F94` | Actual node overrides differ from generic primary token. Test contrast, focus and wrapping, not just token presence. |
| Kettle tokens | Canvas `#F1F4F5`, surface `#FFFFFF`, ink `#111111`, muted `#666666`, line `#E8E8E8`, primary `#4373B3`; Hook `#66509A`/`#F0EAFB`, Showcase `#276C59`/`#E4F3EC`, CTA `#925035`/`#FCEADD`; spacing 8/16/24/32px | Generic surface radius token is 20px while inspected cards use 24px. Prefer the mapped component's actual styles and document deviations. No dark token family was found in the Kettle export. |

No host-owned conversation, attribution, panel close/header chrome or composer belongs
inside the components. No Paper media assets are licensed by this inspection; fixtures
will use fictional text and local placeholders, with no remote fonts/images/providers.

## Proposed presentation props/events — for Bangkok and Berlin review

This is a semantic proposal, **not TypeScript business types, tool names or a frozen
API**. Import approved D0 outputs and request types when merged; do not translate this
table into a parallel schema. Prefer the existing mount/render/dispose lifecycle with
separate scan, DNA, recommendations and script views. No component fetches or stores
account identity. Berlin validates/correlates server results and owns bridge, polling,
request IDs, context sharing, capability detection, navigation and text fallback.

| Proposed view | Props needed from authoritative D0 output plus presentation state | Proposed event / recipient |
| --- | --- | --- |
| Scan progress | Profile identity and supplied/canonical URLs; job/input identity; real stage/status; requested/returned counts, coverage period, exclusions/errors, last status time; permitted partial result if any; available actions with disabled reason | `onRefresh` reads existing job only; `onRequestCancel` records intent only if operation supported. Initial `onRequestScan` is a distinct explicit action against approved inputs, never a render effect. |
| DNA review | Saved DNA/version; linked observations with dates; trait origin (observed/inferred/user-corrected), method and uncertainty; correction draft/pending/conflict; currently permitted actions | `onRequestCorrection` identifies the trait and displayed DNA version for Berlin's chat handoff. If D0 supports inline edits, `onSubmitCorrection` uses its imported request type. No silent save on blur; correction UI choice needs approval. |
| Recommendation batch | Exact batch and bound profile/DNA/brief/taxonomy/observation versions; ordered ideas; fit/execution/limitations; dated permitted sources/metrics; selected and pending idea separately; optional stale-input notice | `onSelectIdea` carries batch identity and exact idea identity, not ordinal text. Local filtering emits `onVisibleOrderChange` with same-batch IDs. `onRequestGeneration` is separate and explicit; if later combined, action wording must disclose generation. |
| Script variants | Available variants and selected variant/version; complete filming fields and lineage; estimated duration; generation state; persisted script version, bookmark/save receipt state separately; save failure/conflict | `onSelectVariant` changes display only. `onRequestSave` references the exact variant/version and imported D0 mutation input. `onRequestText` requests full selected-version text. Open-source navigation emits only a validated source reference. |

All event names are illustrative. Final exports should live in `apps/panel/creator-loop/`;
Berlin's bridge must depend on those agreed exports. A read-only view must remain
usable when the host cannot call tools: show a reason and an actionable chat fallback,
never an enabled inert control or permanent spinner. An explicit availability field
per action is preferable to inferring it from data presence (the Milestone C interface
could not represent this directly). UI availability is not server authorization.

Local selection, expanded evidence and correction drafts are presentation state.
“Selected”, “Saved DNA version N” and “Saved for later” require their matching server
acknowledgement; do not promote local highlights or pending writes into those claims.
During same-record refresh, retain focus, disclosures and draft text. An account/auth
boundary clears private snapshots and drafts; ordinary transient read failures can
retain clearly labelled previously loaded data. Berlin must reject stale/out-of-order
responses before rendering. Dispose detaches handlers and ignores late renders.

## Acceptance inventory for the first post-D0 component PR

All cases below are **planned, not passing implementation tests**. Fixtures must come
from, or validate against, merged D0 definitions. Example persona: a fictional beginner
running creator, synthetic IDs and `example.com` URLs; visibly labelled fictional preview.
No real handles, screenshots, provider metrics or credentials are needed.

| ID | Fixture / interaction | Required observable result | Primary proof owner |
| --- | --- | --- | --- |
| UI-D01 | Queued → running → terminal; absent percentage | Actual step and last checked time; no simulated percentage or auto-restart. Refresh and reopen emit only reads. | UI callbacks; Berlin lifecycle |
| UI-D02 | Request 10, receive 6; pagination unknown, deleted item and one provider error | “6 returned; 10 requested” plus coverage dates/exclusions; never “last ten” or complete coverage. Partial persisted data distinguished from complete success. | UI + Generation/D0 |
| UI-D03 | Inaccessible/private/unsupported profile; no observations | Honest unavailable state and description/chat recovery; no invented DNA or implication of social account ownership. | UI + Berlin |
| UI-D04 | Missing views/shares/followers, a genuine zero, two dated conflicting observations | Unknown differs from zero; metrics retain source/retrieval and post dates. No unsupported multiplier or causal assertion; denominator/cohort caveat when supplied. | UI + Generation |
| UI-D05 | Caption-only evidence, inferred audience, observed topic, user correction | Each trait has origin, evidence, method and uncertainty. No visual/pacing assertions from captions/thumbnails; geography does not become demographics. | UI + D0/Generation |
| UI-D06 | DNA v2 edited; pending save; success v3; reopened read | Draft clearly unsaved/pending; only acknowledged v3 called saved. Correction history/lineage retained; reopening requires server-backed proof later. | UI state; Bangkok/Berlin persistence |
| UI-D07 | Stale DNA correction or save conflicts with another chat | Preserve user's proposed text while showing latest permitted version; no overwrite, auto-merge or automatic retry with a new expected version. User reconciles explicitly. | UI + Bangkok |
| UI-D08 | Valid batch has 0, 1, 2 or 3 ideas; later pilot fixture has 8 when adopted | Render actual count and shortfall reason; no padding. No-result is successful empty outcome. Empty local filter offers reset without spending. | UI |
| UI-D09 | Reorder/filter batch, select second visible card, double click | Emit exact batch/idea and visible order; one pending action. Separate preview/highlight from saved selection; no index-based identity. | UI + Berlin |
| UI-D10 | Start generation for selected idea, then fail or receive old completion | Prior complete script stays usable; pending target is named. Failed generation does not erase work; old result cannot replace current selection. | UI retention; Berlin correlation |
| UI-D11 | Two or three variants; switch, export and save | Distinct IDs/versions; full hook, opening visual, spoken text, shots/B-roll, on-screen text, showcase timing, CTA, estimated duration and pacing when supplied. Reference-led/Creator Fit/Experimental are proposals, not performance promises. | UI + D0 |
| UI-D12 | Save pending/failure/acknowledged; duplicate save; later reopen | Pending/unsaved and bookmarked/persisted states stay distinct; failure preserves content and offers allowed recovery. No success toast before receipt; no duplicate operation from repeat activation. | UI; Bangkok/Berlin durability |
| UI-D13 | Rate limit, budget exhausted, ambiguous paid timeout, cancellation race | Explain actual state, known retry time only, read/status recovery where allowed. No blind paid retry, reset-date guess or guaranteed cancellation/refund. Existing results retained if authorized. | UI + Bangkok/Berlin |
| UI-D14 | Host tools absent; auth expires; cross-account denial; malformed output | Tools-absent gives text recovery; auth/access failure clears private content, pending selection and draft. Malformed result shows safe error, never raw server/provider logs. | UI clearing; Berlin/Auth validation |
| UI-D15 | Hostile captions/names/URLs (`<img onerror>`, script/data URLs, credential URL), multiline and huge unbroken words | Text rendered inert; safe HTTP(S) source navigation only, no credential-bearing links. No remote media loads/HTML execution; no embedded instruction becomes an action or model directive. | UI; Berlin context safety |
| UI-D16 | Narrow 320/420, desktop 640 and expanded 1024px; light/dark | No horizontal page overflow or clipped controls; stacked evidence/shot rows; long labels/actions wrap; theme comes from host, not a recreated shell. | UI browser/screenshots |
| UI-D17 | Keyboard only, 200% text enlargement, reduced motion, assistive technology | Logical heading/tab order, visible focus, named controls, minimum 44px action target; disclosure/variant choices work with keyboard; status announced once without focus theft; no color-only provenance; no essential animation. | UI browser + manual AT |
| UI-D18 | Source media missing, clipboard rejected, panel unavailable | Script remains complete and readable; permitted source link if available; full selected variant/version text with evidence/limitations and named actions works outside the panel. No automatic filmed/save action on export. | UI + Berlin text fallback |
| UI-D19 | Refresh fails; remount/dispose; project/account changes | Same-record warning labels old snapshot and retains focus; unmount removes callbacks; late render is ignored; new identity clears old private content. | UI lifecycle + Berlin |

Proposed screenshots after implementation: scan-partial, DNA-evidence, DNA-conflict,
recommendations (three and empty), variants-ready and save-failed at 320px/640px in
both themes. Add long-content shots and 1024px comparison where layout changes.
Store captures under this workspace's `.context/` and link/attach with exact fixture,
viewport, theme and command in the component PR. Static Paper inspection is not a
component screenshot or accessibility test. Manual VoiceOver, actual ChatGPT narrow/
dark/CSP, interrupted jobs and later-chat retrieval are separate evidence gates.

## D0 requests and blockers

1. **Bangkok — blocking production UI:** merge approved presentation-ready contract
   exports and fictional fixtures for profile/coverage, observations, DNA provenance/
   corrections and jobs. Later batch/selection/script views wait for their own approved
   outputs; an initial profile/DNA seam need not freeze all D4 types. Define optional/
   unknown values, bounds and permission-safe field projection. No shared changes made here.
2. **Bangkok + Berlin — blocking mutation controls:** settle expected-version/request-ID
   inputs, accepted selection receipt, stale-input/recovery semantics and persisted
   script versus Vault-save state. Confirm whether corrections stay in chat first or
   gain inline entry. Await agreed action availability/capability presentation.
3. **Bangkok + Berlin — sequencing:** select vs generate must have an explicit spending
   boundary; paid retry/cancellation follow authoritative job outcomes. Agree compact
   model context and exact visible-order/version handling, plus equivalent text output.
4. **Design review — proposed gaps:** DNA evidence/correction/conflict, variant selector,
   partial scan and narrow/dark states need approval of their adaptations. Full Explore,
   Vault management and extra routes are not silently included in this increment.
5. **Later proof:** component fixtures cannot establish provider coverage/quality,
   permissions, durable mutations, account isolation or actual ChatGPT support. Those
   require the responsible lane and separately authorized hosted/live work.

Next UI PR after the first merged D0 seam: one bounded scan/DNA component slice with
shared fictional fixtures and `tests/panel/creator-loop*`. Add recommendations/variants
only as their contracts land. Bangkok owns shared changes, review and merge; Berlin owns
wiring. This inventory requests review and does not claim either owner's agreement.

## Validation of this preparation PR

- Verified kickoff ancestry and clean pre-sync tree; only this evidence file changes.
- Read-only Paper inspection and exact JSX/style/token sampling completed as listed.
- Local Markdown links: all three relative targets exist. `git diff --cached --check`
  passed after staging the sole changed file.
- Existing fictional-fixture contract test: 1 passed with
  `node_modules/.bin/tsx --test tests/panel/fixtures.test.ts`.
- Existing Chromium component acceptance: 1 passed. Reproduce from repository root:
  `mkdir -p .context/d-ui-validation && cd .context/d-ui-validation && node --test ../../tests/panel/project-review.test.mjs`.
  The isolated working directory keeps newly generated C regression screenshots under
  `.context/d-ui-validation/.context/project-review/`, preserving earlier captures.
- The first browser attempt could not resolve Playwright from stale `node_modules`.
  `npm ci --ignore-scripts` restored the already-locked packages; the rerun passed.
  No dependency or lockfile diff resulted. These are C regression checks, not D proof.
  No new runtime tests are invented for a documentation-only change; UI-D01–19 are
  the future test inventory.
- No D component/preview built before D0. No D acceptance screenshots, hosted tests or
  live-provider evidence claimed. Full `npm run check` is not required for this owned
  documentation-only increment; no shared foundation changes are present.
