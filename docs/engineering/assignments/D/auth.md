# Nagoya — Auth / D authorization readiness

Follow [common kickoff instructions](README.md). Start with a D authorization matrix
under `docs/engineering/evidence/d-auth-matrix.md`: scan, observations, DNA read/correct,
job status/result/cancel, batch selection and script save/read. Map required identity,
ownership, scopes, stale-version/request-ID semantics and expected denial behavior.
Tool names/scopes are proposals until Bangkok integrates D0.

Review existing regression coverage and add meaningful missing cases only under
`tests/d-auth*.test.ts` using existing APIs/fixtures. No production auth/MCP edits in
this increment. Cover account A vs B, guessed IDs, expired/revoked mapping, limited
scope, and no mutation/receipt on denial where existing operations support it. Mark
new D operation cases pending until those operations exist; do not invent mock passes.

Reconcile remaining hosted H1–H4 prerequisites with the runbook. The user's availability
confirmation for account B is still unresolved; do not block/revoke any account or
perform hosted write attempts under this assignment. Return a safe next hosted test
step and precise missing inputs, without requesting secret values.
