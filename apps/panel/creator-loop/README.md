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

States use **imported** D0 types from `packages/contracts/creator-profile.ts`:

```ts
{ kind: 'loading' }
{ kind: 'error'; message: string }
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
- Set `preview: true` for fictional fixture paths, including unavailable/failed scans
  with no observations. Fixture provenance also forces the fictional banner and
  inert URLs even if the caller sets false. Mixed observations conservatively make
  the whole review a preview. `preview: false` still makes no persistence/live claim.
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
Server-authorized saved state may be labelled saved; fixtures force preview labels
and inert links. Bridge authorization, lineage/version validation and text fallback
remain Integration-owned. The shared projection fixture is available as `saved`
in the standalone preview. No public scan-job output is invented here.
