# Malabo — Generation / D1 preparation

Follow [common kickoff instructions](README.md). Preserve your existing C12, provider
check and handoff edits. Do not overwrite root decisions to resolve the lead's planning
entry; include your existing tracked changes in a clearly separated handoff for review.

Start with a sanitized provider-evidence PR: exact verified authentication checks,
unverified backend access, known metric/coverage limitations, per-endpoint cost units,
permissions questions, and reported spend/reservations. Do not print credentials or
copy local attachments. Confirm whether reported no research spend covers all of your
workspace's earlier runs; leave unknown charges unknown. This is input to Bangkok's
authoritative budget reconciliation, not a new spending allocation.

Implementation now: isolate mocked TikTok profile-response characterization in
`packages/adapters/creator-scan/` and `tests/creator-scan*.test.ts`, with authored
fictional fixtures in `evals/creator-loop/`. Own these new paths plus your existing
provider evidence. Do not modify auth/database adapters. No live network in tests.
Keep provider-specific parsing internal until D0 is merged; propose the minimal output
needs to Bangkok rather than publishing a parallel schema. Prioritize null metrics,
stable platform IDs, duplicate videos, partial pagination, inaccessible profiles,
bounded attempts and malformed/untrusted payloads. Never turn absent metrics into zero.

After D0: implement normalized scan output and grounded DNA against lead schemas.
Visual/pacing analysis requires actual permitted video evidence; caption-only fixtures
must not claim visual analysis. Recommendations/corpus/variants follow separate small
increments after this seam. Return tests and an exact list of required shared types.
