# Berlin — Creator-loop MCP/host integration preparation

Follow [common kickoff instructions](README.md). Start a proposal under
`docs/engineering/evidence/d-mcp-integration.md` describing authenticated operations
for start/status/result, DNA correction, selection, generate/save and reopen. Separate
read-only display from actions that write or may spend. Proposed names/metadata are not
registered tools until D0 application contracts are merged.

Define bridge states, UI seam needs and test cases with Shanghai: source/ID/version
validation, request correlation, duplicate clicks, bounded polling/cancellation,
stale results, auth clearing, partial results, text fallback and cross-chat retrieval.
Status/refresh/reopen must not trigger a new paid job. Surface authoritative saved state
instead of trusting caller account IDs or model-produced snapshots.

Wait for merged D0 and stable component exports before editing production MCP/bridge
wiring. Later own dedicated creator-loop bridge/resources and coordinated changes to
`apps/worker/mcp.ts`; do not edit UI-owned components, shared contracts/application,
dependencies or runtime configuration. Preserve project-review behavior and existing
auth metadata. Propose SDK/build changes to Bangkok. Return implementation dependencies
and a concrete actual-ChatGPT acceptance procedure; no live host mutation/deployment now.
