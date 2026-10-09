# Creator flow development trial — 2026-10-09

User requests a testable TikTok URL → bounded scan → correctable DNA → personalized
references/ideas → saved filming variants journey in the connected ChatGPT plugin.
The user subsequently requires **no cash spending** and explicitly chooses ChatGPT
drafting with Kettle saving instead of a separate OpenAI API call. The older $25
aggregate cap is not an allocation for this run.

## Implemented path

Authenticated tools: `start_creator_scan`, `get_creator_job`, `render_creator_job`,
`start_creator_recommendations`, `save_creator_scripts`; existing DNA read/correct
operations remain. Backend `start_creator_scripts` API generation stays unexposed
and disabled. Saving accepts two or three structured variants for a selected batch
and idea, validates reference/DNA lineage, and persists a script job. It does not
construct the provider adapter or call OpenAI. All jobs can be reopened by job ID.

Jobs capture immutable inputs and exact DNA snapshots. Shared request IDs replay
existing jobs; changed inputs conflict. Stale recommendation starts fail; explicitly
selected historical batches retain their original DNA version. Active account and
scope checks precede operations. Public projections exclude account IDs, raw captured
inputs, receipts, costs and permission records. Model-processing permission resolves
underlying captured observations, including user-corrected claims; display permission
alone is insufficient.

The additive `20261009170000_creator_pipeline.sql` migration adds service-only jobs,
append-only events/attempts/receipts, research allowances, dollar reservations and
separate provider trial units. No allocation is seeded. Each provider call reserves
before I/O. Successful receipts replay; ambiguous calls are not automatically
resubmitted or refunded. Job success requires receipts for all attempts. Zero-dollar
calls require an enabled, unexpired ScrapeCreators/Lightreel trial bucket; OpenAI is
excluded from that path. Cash budget stays zero.

Workflows use one guarded request per durable step, fixed job-derived instance IDs,
no provider-step automatic retries, and a scheduled durable-intent dispatcher. Reads
and card refresh never dispatch work. The static card uses the real MCP Apps bridge,
bounded polling, revision/ID checks, auth clearing, teardown and restrictive CSP.

## Bounded development allocation

- Use the original test account selected by the user; the setup script pins that
  account and the existing development Supabase project.
- Creator: `https://www.tiktok.com/@smartykalz`.
- Supplied seed: `https://www.tiktok.com/@smartykalz/video/7685478377012071694`.
  Retained as input; not separately fetched or assumed to occur in the recent feed.
- Scan: at most ten distinct videos/two pages plus one profile request.
- Reference discovery: one blocking Lightreel POST, no history reads by default,
  at most three distinct ScrapeCreators metadata enrichments; no media/transcripts.
- Explicit setup script allocates at most ten ScrapeCreators metadata request units
  and two Lightreel research request units for twelve hours. It never resets an
  existing balance, enables paid overages, tops up a provider account or buys credits.
- Provider trial availability is user-reported. Returned provider credits are
  observations, not dollar-conversion or billing proof. Unknown charges stay reserved.

Credentials stay in ignored owner-only files or Worker secret settings. No cross-
workspace environment file copying. CLI secret commands use `--env development`
without an explicit `--name`: Wrangler 4.147 concatenates both when supplied, which
can accidentally target a duplicate-suffixed Worker. Verify secret names and actual
Worker deployment after provisioning.

## Verification and limitations

Local signed-JWT → real PGlite → injected fake-provider proof covers scan, DNA,
recommendations, ChatGPT draft save, replay, reopen, foreign-account/scope denial,
text fallback and CSP, without an OpenAI API key. Provider tests use synthetic
responses and are not live content, cost or quality evidence. Dedicated browser
checks exercise the real bridge and component. Full checks and hosted/live evidence
are recorded separately by the lead after execution.

Current quality baseline is conservative English caption/metadata reasoning and
lexical reference matching; it may return fewer than three ideas or none. No visual
analysis, measured audience demographics, causal performance or validated semantic
personalization is claimed. Human review/correction is part of the trial.

Operational limits: oldest-first outbox inspection is capped at ten jobs; a larger
pilot needs fair recovery/pagination. Free script saving currently requires the
configured development pipeline and active source allowance, although it consumes
no provider units. Source retention must cover full sanitized feed receipts as well
as admitted public observations; production retention/deletion policy remains open.
This development trial is not production release or submission readiness.

## Hosted integration and transport regression

PRs #33 and #34 merged into `4f2d2f1`. Development migration history confirms the
new `20261009170000` migration, and the original test account has an explicit
12-hour @smartykalz allowance, ten ScrapeCreators units and two Lightreel units.
Cash limit/reservations are zero. Initial deployment version
`48e282b0-422d-47ea-9992-e3f8453fdb5b` exposes all thirteen expected tools and the
static pipeline resource; anonymous reads and invalid tokens are rejected.

After refreshing the actual ChatGPT plugin, its first scan failed before creating
a job. The provider ledger confirmed no attempts or consumed units. A service-role
diagnostic of the same request proved the SQL path and queued the original intent;
this is not claimed as proof of authenticated public scan creation. The cause was
`redirect: error` in both new transports: workerd rejects that mode before I/O.
An actual workerd regression reproduced the TypeError. Both transports now use
`manual` and reject non-2xx responses, preserving no-redirect credential safety.
The regression covers database/provider Request construction and 302 rejection
without any external request. Live completion evidence remains pending.
