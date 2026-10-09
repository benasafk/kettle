# Creator scan and DNA review — Berlin handoff

Read-only component slice on D0 baseline `4a31f3c`. No bridge, provider, storage,
chat-send, refresh, correction or generation calls. Existing project-review exports
are unchanged. Root references and Paper originals remain untouched.

## Exports

`index.ts` exports `mountCreatorReview(root: HTMLElement)` and `CreatorReviewState`.
The mount owns the root's children and returns:

```ts
{ render(state: CreatorReviewState): void; dispose(): void }
```

States use **imported** D0 types from `packages/contracts/creator-profile.ts` and
`CreatorDnaView` from `packages/contracts/creator-operations.ts`:

```ts
{ kind: 'loading' }
{ kind: 'error'; message: string }
{ kind: 'saved'; dna: CreatorDnaView; preview: boolean }
{ kind: 'scan'; scan: ProfileScanResult; preview: boolean }
{ kind: 'analysis'; analysis: CreatorAnalysis; preview: boolean }
```

There are intentionally no action callbacks in this read-only slice. Corrections
stay in chat. Snapshot version is not labelled saved. Scan `complete` means a
bounded sample completed, not that the whole social profile was read.

Berlin responsibilities before calling render:

- Authorize the read and validate the full `ProfileScanResult` / `CreatorAnalysis`
  envelope with the merged schemas. The component imports types only; it is not an
  authorization or schema-validation boundary. Validate full analysis lineage rather
  than a DNA snapshot alone. Supply only display-authorized content.
- Correlate results, reject stale/wrong-identity responses, handle freshness and
  recovery. Rendering an older version does not trigger any write or version repair.
- Set `preview: true` for local fixture inspection. In the production `saved` state,
  use `preview: false` for persisted DNA, including fictional test data. The shared
  `contains_fixture_data` flag OR any fixture evidence marks fictional content and
  keeps source links inert, but does not change Saved version into Preview version.
  Raw scan/analysis inspection states do not establish persistence.
- Supply safe user-facing error text. Rendering loading/error clears prior content;
  use these at identity/auth boundaries. On account change, dispose/remount even if
  a scan ID happens to match. Same-scan renders retain open evidence and keyed focus.
- Inherit `color-scheme` from the host, arrange resource packaging and CSP with
  Bangkok. Styles are a local string inserted in a scoped style element (same pattern
  as project review); host build/resource entries are not changed here.
- Provide equivalent full tool text for hosts without a usable card. This component
  does not implement the bridge's text response or claim actual ChatGPT support.

Additional defense in depth: observations lacking display permission are withheld,
including claims whose evidence cannot be displayed. All supplied text uses textContent.
Non-fixture source links allow only HTTP(S), reject embedded credentials, and use
noopener/noreferrer. No source is fetched; fictional platform URLs are inert text.
Provider endpoint, cost attempts and internal raw logs are not rendered.

Dispose is idempotent, removes the view, and makes future renders no-ops. Multiple
instances have no shared DOM IDs or global state. Native details/summary provides
keyboard evidence disclosure; a persistent polite status region announces outcomes.

## Fictional preview and tests

From repository root (existing locked dependencies installed):

```sh
node apps/panel/creator-loop/preview-server.mjs
# http://127.0.0.1:4175/?scenario=review&theme=dark
# Optional: PORT=4176 node apps/panel/creator-loop/preview-server.mjs
node_modules/.bin/tsc --noEmit -p tsconfig.panel.json
node_modules/.bin/tsx --test tests/panel/creator-loop-fixtures.test.ts
node --test tests/panel/creator-loop.test.mjs
```

The standalone server bundles only its preview entry in memory with the existing
esbuild dependency, binds loopback, and serves an explicit two-route allowlist. It
does not change shared build/runtime configuration or become a production entry.
CSP blocks connections/images and permits only self scripts plus component styles.
No fixture imports are reachable through the production component export.

Preview scenarios: review (observed/inferred/user-corrected), partial, unavailable,
failed, empty DNA, long, hostile text, withheld evidence, loading and error. They
extend the **shared fictional D0 fixtures**, and data variants validate against the
shared schemas. No parallel business types/schemas or provider samples are authored.
The three basis labels in the review are illustrative; no correction was persisted.

The browser test writes captures to `.context/creator-loop/`: full `320-light.png`,
`320-dark.png`, `640-light.png`, `640-dark.png`, and corresponding `dna-` section
captures. Change viewport width to inspect narrow/desktop; themes are preview controls
outside the component. Preview never calls a provider or host, including on load.

## Design and remaining integration

Follows the [Paper inventory](../../../docs/engineering/evidence/d-ui-inventory.md):
creator context (`P9O-0`), progress surface (`OGI-0`) and script typography. Surface
padding/radius 24px, section gap 24px, related gap 16px, system typography, heading
24/30px. DNA evidence/labels and dark/narrow adaptations are new UI adaptations of
that source, not a claim that Paper already had a complete DNA screen. No ChatGPT
chrome, composer, attribution, remote media or font assets are reproduced.

Read-only component tests cannot establish durable corrections, ownership/isolation,
provider coverage, actual host behavior, or paid-job safety. Bangkok owns D operations
and shared packaging; Berlin owns bridge/resources, tool text and actual-host proof.
Those do not block this standalone slice but remain prerequisites to integration.
Manual VoiceOver, Firefox/Safari, real devices and actual ChatGPT CSP/theme checks
remain unverified. Recommendations, variants, saving and job progress are out of scope.

## Validation recorded for this slice

On 2026-10-09 against `4a31f3c` plus this component:

- `tsc --noEmit -p tsconfig.panel.json`: passed.
- Shared-schema fixture validation: 1 test passed across all preview scenarios.
- Dedicated Chromium suite: 6 tests passed (parent plus five acceptance groups).
  Covers coverage/dates, unknown versus zero, all claim origins, permission withholding,
  partial/unavailable/failed/empty/loading/error, hostile text, safe source links,
  keyboard Enter/Space/Tab, focus/disclosure retention, identity change, disposal,
  320/640px light/dark, expanded evidence, long text and 200% text enlargement.
  No external requests or browser errors; direct lifecycle test observed zero fetches.
- Screenshots visually inspected: desktop/narrow in both themes, including DNA crops.
  Labels stack on narrow layouts; full statements and actions remain within the card.
- Staged whitespace check passed. Only component/preview/docs under this directory
  and dedicated `tests/panel/creator-loop*` change. No shared build or bridge edits.

These are local fictional component results, not persisted/live-provider or hosted
ChatGPT proof. A full shared-foundation check was not run for this isolated slice.

## Storage-interface reconciliation (Bangkok review)

Production Integration must use `{kind:'saved', dna: CreatorDnaView, preview:false}`
from the validated authenticated `GetCreatorDnaOutput` or `CorrectCreatorDnaOutput`.
This path consumes the filtered view from PR #20 and never requires internal scan
or analysis envelopes. The earlier `scan`/`analysis` states are standalone fixture
inspection paths; do not transmit internal data to ChatGPT to satisfy those props.
Server-authorized saved state is labelled saved, including fictional test data;
fictional provenance keeps links inert and adds a test-data notice. Bridge authorization, lineage/version validation and text fallback
remain Integration-owned. The shared projection fixture is available as `saved`
in the standalone preview. No public scan-job output is invented here.

## Filtered-view accessibility/recovery review — Shanghai

Reviewed actual merged saved rendering at `86f8327840a883347ddb8d00170d2bffb3d5de44`.
Branch fast-forwarded without reset/rename; earlier local follow-up notes preserved.
Production `CreatorReviewState` and mount/render/dispose exports remain unchanged.

Component fixes from this review:

- Saved evidence summaries visibly identify dimension and trait position; native
  Enter/Space behavior is retained. Text is also present in Chromium's accessibility
  snapshot, rather than relying only on an ARIA override for native summary.
- Same-project/DNA updates retain open evidence and keyed focus. Removed/replaced
  claims fall back to the Creator DNA heading; loading/error falls back to the review
  heading only when focus was inside the removed content. External focus is untouched.
- Identical saved-version status messages do not rewrite the live region. Error
  announcements include the supplied safe recovery message. Historical versions are
  labelled by version, never “latest”.
- Filtered evidence exposes its fixture/provider origin, explains a null metrics set,
  and keeps zero/unknown distinct. The explicit coverage_limited flag is shown even
  when limitations are empty. Missing references still withhold the entire claim.

Validation: panel TypeScript check passed; both dedicated creator browser suites
passed (12 tests including two parent groups); fixture-schema test passed (1 test).
New filtered-view cases cover keyboard/accessible text, correction focus fallback,
project identity changes, no repeated status mutation, missing/withheld evidence,
error/loading clearing, external focus, 320/640 light/dark, long text, 200% text,
hostile text and disposal. Zero browser errors/external requests. Initial assertions
failed on the merged baseline before the component fixes. This is local fixture proof.
Repeat: `node --test tests/panel/creator-loop-saved.test.mjs`.
Captures: `.context/creator-loop-saved-review/{320,640}-{light,dark}.png`.

### Integration coordination — no interface change required

Berlin can continue saved-view wiring. Consume only the authorized filtered public
output. Supply `preview:true` only for local preview paths. Persisted fictional test
data uses `preview:false`; the required `CreatorDnaView.contains_fixture_data` flag
from Bangkok preserves its fictional label even when all evidence is corrected away
or withheld. Fixture evidence independently triggers that label. Raw fixture
inspection states are not a production fallback. Export signatures are unchanged.

The current error state accepts a safe message, not a Failure object. Berlin should
map reauthorization to an explicit reconnect message, conflict to reopening current
DNA before correcting in chat, and denied/not-found to nondisclosing unavailable copy.
Rendering error/loading clears private output; account changes require dispose/remount.
No component change adds retry, writes, generation, or an optimistic saved snapshot.
Berlin remains responsible for request/identity/version correlation, historical reads,
text fallback and auth clearing. Source evidence links are display links, not fetches.

Manual VoiceOver announcements, Safari/Firefox, actual ChatGPT focus/theme/CSP and
cross-chat recovery remain Integration/host acceptance work. There is no new blocker
for Berlin's saved-view wiring. Bangkok reviews/merges the component-only follow-up;
no shared contracts/build/runtime, bridge, provider or deployment changes are included.

## Persisted fictional-data labeling follow-up

Against main `f6b79f9`, saved rendering now separates persistence from provenance.
`preview:true` retains the local preview/no-saved-changes notice. `preview:false`
always shows Saved version; fictional content adds “Contains fictional test data”
and “This is not live provider evidence.” The polite status includes the fictional
notice. The flag OR fixture evidence keeps fictional source URLs inert.

Validation: both Chromium suites passed (13 tests including parent groups), shared
fixture-schema test passed (1), and whitespace check passed. Dedicated cases cover
saved fixture evidence, flag-only corrected/withheld empty evidence, evidence fallback
when the flag is false, non-fixture saved data, and local preview. Saved fictional
captures: `.context/creator-loop-saved-review/saved-fictional-{320,640}-{light,dark}.png`.
Existing keyboard, recovery, long-content and hostile-text checks remain passing.

Bangkok's required `CreatorDnaView.contains_fixture_data:boolean` schema/projection
commit `0e53245` was fast-forwarded into this branch without modifying shared files.
Panel TypeScript passes against that commit. Every new variant validates through
the shared schema; no local schema/type substitute was added. These are local fixture
checks, not proof of hosted persistence or actual ChatGPT behavior. Berlin owns actual
bridge/host verification; exports and callbacks are unchanged.
