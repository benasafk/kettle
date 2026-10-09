# Creator pipeline — Berlin handoff

Component-only implementation against merged baseline `d8b7b5d` (PR #27).
Existing saved DNA component remains unchanged. Uses its typography, spacing,
light/dark tokens and native disclosure pattern; pipeline composition is new UI.
No shared contracts, application, migrations, runtime/build or bridge edits.

## Export and host responsibilities

```ts
import { mountCreatorPipeline } from './creator-pipeline/index.ts';
const view = mountCreatorPipeline(root);
view.render(job); // CreatorJobView from packages/contracts/creator-pipeline.ts
view.dispose();
```

Mount owns root children. Dispose is idempotent; renders after disposal do nothing.
No callbacks, host/provider/network/storage calls or implicit paid actions. Production
imports contain no fixtures. Styles are scoped strings inserted into a style element,
following the existing DNA card; host CSP/resource packaging remains Integration-owned.
The standalone preview permits local scripts/inline styles and blocks connections,
images, forms and external assets.

Berlin validates the full `CreatorJobOutput`, authorizes display, correlates job/project
IDs, rejects lower revisions and controls bounded refresh. The component renders exactly
the supplied job; it never resolves newer DNA. Account/auth boundaries require
clear/dispose/remount. Mount initially announces waiting for job details; this is not
an invented job state or operation envelope. Auth errors and pre-job loading belong
to the controller. Only safe public `message` strings should reach render.

Same-job rendering preserves open disclosures and keyed focus. Removed controls or
job changes move focus to the heading only when focus was inside replaced content;
outside focus is untouched. Persistent polite status announces result/recovery text
and captured DNA version without repeating identical text mutations. Embedded scan
completion uses the existing saved DNA card and its own accessible status.

## Behavior and lineage

- Queued/running show supplied state/update time; no invented progress/ETA.
- Failed gives chat recovery; reconciliation explicitly discourages retry/paid work
  until the uncertain outcome is resolved. Opening the card never retries.
- Scan success embeds `{kind:'saved', dna, preview:false}` and gives chat instructions
  to request ideas using that DNA version. Fictional persisted DNA stays labelled saved.
- Recommendations render the actual zero-to-three ideas, fit, evidence, execution,
  limitations and references. Zero ideas stays empty; missing references defensively
  withhold the idea. Null metrics/dates are Unknown; reported zero remains zero.
- Scripts render the supplied two-to-three variants with hook, opening visual, script,
  shots, B-roll, on-screen text, timing, CTA, pacing and limitations. Native disclosures
  offer keyboard access. Duration is an estimate. Script reference IDs point back to
  the immutable batch; this contract supplies no reference URLs/dates with scripts,
  so the UI directs users to reopen the batch rather than inventing or fetching them.
- Recommendations and scripts prominently show **Captured DNA version**, DNA ID,
  batch lineage and creation time. Later corrections do not change historical results.
  Selection instructions name the specific idea and batch; stable idea IDs are shown.
  Historical batches remain valid. No latest/current-version claim is made.
- `contains_fixture_data` or fixture reference origin marks fictional recommendations;
  scripts use their required provenance flag. Fictional source URLs stay inert.
  Preview chrome explicitly says it is an unpersisted local simulation, even when
  demonstrating persisted-state copy. No fixture is claimed to be live evidence.

All supplied text uses textContent. Display links reject non-HTTP(S) schemes and
embedded credentials and use noopener/noreferrer. Public contract validation and
server display authorization remain required. No media/captions are interpreted
as markup, fetched or executed. No reference permission or performance is inferred.

## Repeatable preview and verification

From repository root with existing locked dependencies installed:

```sh
node apps/panel/creator-pipeline/preview-server.mjs
# http://127.0.0.1:4177/?scenario=ideas&theme=light
# http://127.0.0.1:4177/?scenario=scripts&theme=dark
# Optional PORT=4178
node_modules/.bin/tsc --noEmit -p tsconfig.panel.json
node_modules/.bin/tsx --test tests/panel/creator-pipeline-fixtures.test.ts
node --test tests/panel/creator-pipeline.test.mjs tests/panel/creator-loop-saved.test.mjs
```

Loopback preview bundles in memory using existing esbuild; no shared build changes.
Scenarios: ideas, empty, three-ideas, scripts, three-variants, scan, queued, running,
failed, needs_reconciliation, long, long-scripts, hostile. All variants derive from
`evals/creator-loop/pipeline-fixtures.ts` and validate through `CreatorJobView`.
No duplicated schemas or provider samples.

## Evidence and limits

Local validation (2026-10-09): panel TypeScript passed; shared-schema preview validation
passed (1 test); Chromium pipeline acceptance and existing saved-DNA regression passed
(12 tests including two parent groups). Browser acceptance
covers states/results, zero/three ideas, two/three variants, captured version/history,
reference dates/null/zero, fictional labels, safe links, native Enter/Space controls,
focus retention/recovery and external focus, stable announcements, disposal,
320/640 light/dark, enlarged/long/untrusted text, and no external requests/page errors.
Direct lifecycle instrumentation checks zero fetch calls.

Screenshots generated by the browser suite under
`.context/creator-pipeline/{ideas,scripts}-{320,640}-{light,dark}.png`.
Desktop light ideas and narrow dark scripts were visually inspected. Preview captions
and notices distinguish local fixture proof from persistence and live provider proof.

Manual VoiceOver, Safari/Firefox, actual ChatGPT theme/CSP/focus, bounded controller
polling, host auth clearing, durable jobs, paid guard behavior and real provider
results are not proven by these tests. No deployment/live calls/spend occurred.
Bangkok owns shared wiring/review/merge; Berlin owns bridge and actual-host evidence.
