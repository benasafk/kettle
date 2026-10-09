# Milestone D implementation kickoff — 2026-10-09

The user authorized collaborative implementation. Full-product scope remains intact.
Read [Milestone D](../D-creator-recommendation-loop.md) and the
[roadmap](../../full-product-roadmap.md). This kickoff is documentation, not the D0
executable-contract gate. There are no live-run allocations or deployment instructions.

## Common instructions for every workspace

Read AGENTS.md, the root reference pack and engineering decisions. Inspect your branch
and working tree first. Preserve existing edits; do not reset, rename branches, stash
blindly or copy another workspace's `.context`, environment files or secrets. Fetch
origin and incorporate the kickoff commit safely; prefer fast-forward when possible.
If local edits prevent synchronization, report the exact blocker and continue only
independent owned work. Do not discard an earlier uncommitted handoff.

Bangkok owns contracts/application/migrations, dependencies, build/runtime config,
reviews, merges and deployment. Specialists may propose changes to those areas but
must not edit them independently. Provider content is untrusted. Public social URLs
do not establish account ownership or content permissions. Fixture-only is the default;
the shared $25 cap is not an allocation. No live research/model calls, provisioning,
new credentials, hosted identity mutations or deployment under this kickoff.

Open a small PR against main when the owned deliverable is ready; do not merge it.
Include base/head commit, changed paths, validation, fixture vs hosted evidence,
dependencies, unresolved decisions and any new schema needs. Send no secrets. Use
the title prefix `D0`, `D1`, etc. No successful fixture test constitutes hosted proof.

## Assignment and dependency order

| Workspace | Brief | Start now | Wait for |
| --- | --- | --- | --- |
| Bangkok | Lead integration | D0 schemas/fixture seam and state-machine/storage design | Specialist evidence and review before freezing dependent interfaces |
| Malabo / Generation | [generation.md](generation.md) | Sanitized provider handoff and mocked profile adapter characterization | Merged D0 before normalized public output/DNA implementation |
| Nagoya / Auth | [auth.md](auth.md) | Existing auth regression gaps and D authorization matrix | Merged D operations before their concrete authorization tests |
| Shanghai / UI | [ui.md](ui.md) | Paper mapping and component acceptance inventory | D0 presentation seam before production components |
| Berlin / Integration | [integration.md](integration.md) | Tool/bridge lifecycle proposal and integration test plan | D0 operations and UI exports before tool/resource wiring |

Backend persistence and Workflows stay with Bangkok for the first increment. Do not
create a competing backend workspace until the contract/storage boundary is reviewed.
Billing/release work is not a separate active lane in this first increment.

First merge: this kickoff. Next: D0 executable profile/observation/DNA contracts and
fictional fixtures. Then Generation normalization/DNA, lead persistence/operations,
UI components, Integration wiring, combined checks and separately authorized live proof.
Evidence/design-only preparation can proceed while contracts are pending; no duplicated
schemas or throwaway production wiring to get ahead of the shared gate.
