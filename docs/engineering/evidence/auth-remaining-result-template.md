# Hosted auth remaining checks — blank result record

Status: **NOT RUN**. Copy to a new tracked evidence file only after collecting and
sanitizing actual observations. This template is not an acceptance result.

- Run ID / UTC window:
- Operator / Bangkok approval reference for each action:
- Deployed commit/version / database project alias:
- Actor A / B internal IDs; private issuer-subject and client mapping verified by:
- Target project/current version and request UUID:
- Provider rotation/expiry/revocation settings (no secrets):
- Evidence basis: operator-observed / user-reported / local fixture:

| Check | Approved target/action | UTC | Status: pending/pass/fail/inconclusive | Evidence reference |
| --- | --- | --- | --- | --- |
| H1 cross-account write | | | Pending | |
| H2 limited scopes | | | Pending | |
| H3 cutoff | | | Pending | |
| H3 block/new credential | | | Pending | |
| H3 unblock/cutoff retained | | | Pending | |
| H4 website provider grant | | | Pending | |
| H4 separate ChatGPT grant, if approved | | | Pending | |

For each observation retain only:

- Actor alias and successful account precheck (HTTP status and Kettle account ID).
- Method/path without query; sanitized tool name/arguments or JSON body; request UUID.
- HTTP status, parsed Kettle code/result and allowlisted auth challenge (no headers dump).
- Verified audience/scope/iat/exp and client alias when available; no JWT or cookie.
- Provider action/failed-exchange event IDs, UTC, event type and error code; no raw event.
- Project before/after equality, brief-history counts and rejected-request receipt count.
- Mapping before/action/final block/cutoff values and affected-row count; omit raw subject.
- A control result, B recovery result, deviations, missing evidence and remaining checks.

Recovery sign-off: B unblocked, cutoff retained, fresh authorization restores the same
account; provider grant restored by reauthorization; A/project unchanged. Record any
exception and Bangkok's follow-up. Never mark recovery complete without observing it.
