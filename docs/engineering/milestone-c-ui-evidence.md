# Milestone C: project-review component evidence

Shanghai → Bangkok, 2026-10-06. Component and fictional fixture evidence only.
Branch starts at `7203fad`; ancestry verified with `git merge-base --is-ancestor 7203fad HEAD`.
No branch rename, reset, Paper mutation, dependency/configuration change, merge or deployment.

## Delivered interface

`apps/panel/project-review.ts` exports the exact `ProjectReviewState` and
`mountProjectReview(root, { onRefresh })` interface in the C brief. Styles are imported
as a TypeScript string, so a consumer bundles one module graph without a separate CSS
loader. The component mounts in loading state. `dispose` removes its listener and DOM;
subsequent renders are ignored. A mount owns the supplied root's contents.

The bridge must supply validated `Project` snapshots, safe error/warning messages,
refresh state, and matching/version-ordered results. This UI does not call tools,
fetch, write, store or log project content. Only the fixture entry imports fixtures.

The card displays every existing brief field, saved version, confirmation status,
source kind and captured date. The full source timestamp remains in the semantic
`time` element and its title. Facts use a native disclosure; all statements are
available, with no truncation. Safe HTTP(S) source links use explicit clicks,
`target=_blank`, `noopener noreferrer`, and no referrer. Invalid schemes or URLs with
credentials produce no link. The displayed source URL is never fetched by the UI.

All supplied text goes through `textContent`, including errors and warnings. Loading
and errors replace stale content. Refresh preserves the saved snapshot, disables
repeat activation with `aria-disabled` plus an event guard, and retains button focus
and the facts disclosure state for the same project. No animation is used.

## Paper comparison

Read the original [Paper 1.5B design](https://app.paper.design/file/01M39TTB7DKFHZY2JVDMAEDZ81/p-5-0)
using `get_jsx`, `get_computed_styles` and `get_tokens`; token hash `79b59143`.
Visually inspected the original component and all four fixture screenshots.

| Detail | Export → implementation |
| --- | --- |
| Outer surface | 24px padding/radius; subtle near-white gradient and inset/drop shadows |
| Heading | 24px/30px, weight 650, tracking -0.025em; required “Your project brief” copy |
| Product summary | 16px padding/gap/radius, `#EFF4F2`; name 22px/28px, weight 700; summary 15px/22px |
| Label/value rows | 106px label column, 16px gap/vertical padding; 14px/20px labels and 16px/24px values |
| Footer | 20px top spacing; 13px/20px supporting text |
| Narrow adaptation | Container query at 420px; stacked rows, 20px outer padding, 36px generic mark |
| Dark adaptation | Inherited CSS `color-scheme`, semantic `light-dark()` pairs; authored dark values, not a Paper dark export |

System fonts intentionally replace Bricolage Grotesque/DM Sans. Generic document mark
replaces the example brand logo. No niche, benefit, website, content angles, editable
fields, composer, attribution or conversation is invented. No Paper page was modified.
Visual verdict: aligned desktop rows, clear hierarchy/contrast, consistent spacing,
and no clipping at 320px; mobile labels stack and the full card grows vertically.

## Repeatable preview

From the repository root after the normal dependency setup:

```sh
node apps/panel/fixtures/serve.mjs
# Open http://127.0.0.1:4173
# Optional alternate local port:
PORT=4174 node apps/panel/fixtures/serve.mjs
```

Select a scenario, card width (320/420/640), and light/dark/system theme. Click
“Supplied facts” to expand it. “Refresh brief” simulates an 800ms read of the same
fictional saved version; it does not save or imply real persistence. The standalone
server only serves its explicit component/fixture allowlist on loopback. Its CSP
blocks network connections and external assets. No credentials are needed.

Scenarios: saved brief, empty constraints/facts, 50 long facts and long/unbroken text,
hostile markup, initial loading, refreshing, refresh failure with last snapshot,
unavailable project and reconnect guidance. Preview controls are outside the card.

## Validation performed

- Targeted strict TypeScript check: passed.
- `npx --no-install tsx --test tests/panel/fixtures.test.ts`: passed; all four fixtures
  validate against the existing authoritative `Project` schema.
- Browser acceptance (`tests/panel/project-review.test.mjs`): passed on cached
  Playwright 1.62.1 / Chromium, without changing repository dependencies.
- Existing `npm test`: all 53 tests passed. This command currently excludes nested
  panel tests; run them explicitly below.
- `git diff --check`: passed.

Browser acceptance verifies field/version mapping; confirmed/unconfirmed provenance;
safe and unsafe URLs; Enter-operated disclosure and refresh; duplicate activation;
focus and disclosure retention; stale-content removal on loading/error;
empty lists; hostile markup remains text; listener disposal and ignored late render;
zero external requests; 320/640px overflow in both themes with long expanded facts;
and enlarged text under reduced-motion preference. It produces four screenshots.

```sh
./node_modules/.bin/tsc --noEmit --target ES2022 --module ESNext \
  --moduleResolution Bundler --lib ES2022,DOM,DOM.Iterable --strict \
  --noUncheckedIndexedAccess --skipLibCheck --allowImportingTsExtensions \
  apps/panel/project-review.ts apps/panel/fixtures/preview.ts
npx --no-install tsx --test tests/panel/fixtures.test.ts
# Point to an existing external Playwright installation (index.mjs), or omit
# PLAYWRIGHT_MODULE if Bangkok has made playwright available in module resolution.
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
  node --test tests/panel/project-review.test.mjs
```

Screenshots are generated under this workspace's gitignored `.context/project-review/`:
`640-light.png`, `640-dark.png`, `320-light.png`, `320-dark.png`. They are embedded in
the UI handoff response and can be regenerated by the browser test. They contain
fictional data only; no `.context` files were copied between workspaces.

## Bangkok: shared-change requests and integration limits

1. **Capability state is missing from the agreed seam.** `ready` has no way to express
   “valid snapshot, but host cannot call tools.” Please approve an optional
   `refreshAvailable?: boolean` (default true for compatibility) with reopen-in-chat
   guidance before UI implements it, or specify another explicit interface. No such
   extension is implemented here. Until resolved, Integration must use the existing
   `error` / `reopen` state for unsupported hosts; that clears the snapshot. Do not
   pass `refreshing:true` indefinitely or rely on a no-op callback as a capability gate.
2. **Test runner integration:** the root `npm test` glob omits `tests/panel/`. Please
   own adding nested fixture tests and choosing/pinning browser-test tooling/CI if
   desired. No dependency or root command was changed by UI.
3. **Host assembly:** bundle the component's imported styles and allow their injected
   style element under the resource CSP; set document `color-scheme` from the host's
   theme. This component inherits it and neither detects nor communicates with a host.
   System theme preview is browser-only evidence, not proof of bridge theme updates.

No MCP SDK or bridge API is selected by this component: it uses DOM APIs only.
Installed foundation MCP SDK is 1.32.1; the protocol/version selection and runtime
bundle/CSP are Integration/Bangkok responsibilities. No shared business schema change
is requested. Full `npm run check`, resource smoke, real ChatGPT placement/theme/link
handling, authentication, persistence and refresh ordering remain combined acceptance.
Screen-reader announcements use a persistent polite live region but have not been
manually tested with VoiceOver. Safari/Firefox and real-device text zoom remain
unverified. Standalone fixture success is not ChatGPT compatibility evidence.
