# Milestone C — lead-owned browser build

Bangkok approves pinned `@modelcontextprotocol/ext-apps` 1.7.5 and direct dev dependency
`esbuild` 0.28.2. Published ext-apps peer requirements accept MCP SDK 1.32.1 and Zod
4.6.5; React peers are optional. No React or MCP SDK upgrade is introduced.

## Artifact contract

`npm run build:panel` bundles `apps/panel/bridge.ts` and its imported real component
`apps/panel/project-review.ts` into one browser IIFE. Output:

```ts
// apps/panel/generated/project-review-bundle.ts
export const projectReviewScript: string = /* bundled browser source */;
```

Integration imports that string from `apps/worker/project-review-resource.ts` and
assembles the static HTML resource. The bridge must mount into the element agreed
within its own resource module. Bundle imports are resolved at build time; no remote
imports, separate CSS/assets, source maps, credentials or fixture fallback are emitted.
Use the UI component's bundled style string. Retain script-closing escaping during
resource assembly even though esbuild also escapes inline-script literals.

The generated directory is gitignored. Fresh builds delete the old artifact first,
so a broken entry cannot silently reuse a previous bundle. The output is written
atomically. No generated code is committed or copied between workspaces.

Before the Integration source is merged, absent bridge AND resource files produce
an explicit “not present” result and no artifact. This allows the build prerequisite
and UI PR to land first. Once either integration file exists, missing bridge/component
is a hard error. A bridge that never imports the component is also a hard error.
This bootstrap condition never produces a placeholder UI.

## Command wiring

npm pre-hooks build the panel before `dev`, `build`, `build:development`, `typecheck`,
`test`, and `smoke`. Consequently `npm run check` prepares it before each relevant
phase. Direct `npx wrangler` / `npx tsx` invocations bypass npm hooks: explicitly run
`npm run build:panel` first, including before lead-controlled deployments.

This initial build is one-shot. After editing panel sources during a running dev
session, rerun `npm run build:panel` or restart `npm run dev`. No watch process or
runtime configuration change is introduced in this prerequisite.

Integration must still prove the real bundled resource loads in workerd and ChatGPT.
Peer compatibility and build tests alone do not establish hosted rendering.

The exact auth tool-list assertion requested by Integration will be updated by
Bangkok alongside the render-tool integration, not before that tool exists.

## Dependency audit

The install reports three high-severity audit entries on the existing
Wrangler → Miniflare → sharp development dependency chain
([GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)).
Those packages were unchanged by this lockfile diff. Do not run the suggested forced
Wrangler downgrade as part of this UI prerequisite; track remediation separately.

Sources: [ext-apps v1.7.5](https://github.com/modelcontextprotocol/ext-apps/releases/tag/v1.7.5),
published npm peer metadata, and [esbuild API](https://esbuild.github.io/api/).

## Browser verification

Worker and browser sources use separate TypeScript projects so Cloudflare's
HTMLRewriter DOM names cannot override native browser APIs. `npm run typecheck`
checks both projects. `npm test` discovers all nested TypeScript test suites;
`npm run test:browser` discovers the browser `.test.mjs` suites. Both run in
`npm run check`. Install Chromium with `npx playwright install chromium` locally;
CI installs Chromium and its system dependencies before running checks.
