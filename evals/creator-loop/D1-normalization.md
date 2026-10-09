# D1 normalized mock scan and grounded DNA baseline

Input baseline: `4a31f3c` on 2026-10-09. Current branch on arrival was
`gustasbull/git-npm-setup-check-v4`, already synchronized and clean. It was preserved;
this task did not rename/reset/stash branches or modify prior handoff commits.

## Deliverable and use

`normalizeMockTikTokScan` converts the internal provider characterization into the
merged `ProfileScanResult` from `packages/contracts/creator-profile.ts` and validates
the **entire envelope**. `buildGroundedCreatorDna` accepts a validated resolved scan
and returns a fully validated `CreatorAnalysis`, including observation/claim lineage,
modalities and permitted uses. There are no parallel shared schemas or contract edits.

```sh
node --import tsx evals/creator-loop/run-normalized.ts
node --import tsx --test tests/creator-scan*.test.ts
npm run check
```

The evaluation uses D0's `creatorAnalysisFixture()` for request, profile text, video
text, metrics and times. A thin fixture encoder supplies fictional decimal platform
IDs for the provider-shaped response. No downloaded response, real media, copied
attachment or local credential is included. Output IDs/timestamps are deterministic;
the printed JSON is an authored example, not observed generation or live timing.
The runner rejects arguments and has no live mode or environment activation.

## Normalization behavior

- String platform IDs, matching returned handle and author IDs; canonical TikTok
  source URLs are built locally and never fetched. No Kettle ownership inference.
- Null/absent metrics stay null, genuine zeros survive. Missing publication times
  remain null; invalid timestamps reject the row. Provider duration milliseconds
  become seconds; zero/missing duration becomes null because D0 requires positive
  duration. Live units/coverage must still be checked against an actual response.
- Profile/feed observation IDs are distinct. Duplicate videos retain separate dated
  observations and potentially conflicting counts. Retrieval time and supplied
  source/cache time are separate; unknown source time stays null.
- Page cursors, received/admitted counts, rejected rows, covered dates, unique count,
  failures and attempt IDs are retained. Empty pages, cursor mismatch/stall, missing
  `has_more`, limit and interrupted replays are explicit. At most three pages, fifty
  unique videos and 150 observations; duplicate-heavy pages stop at the shared bound.
- Feed exhaustion is not proof of completeness. Successful mock feeds are partial
  with the documented provider omission warning. Private/unresolved profiles cannot
  carry observations; failed later pages preserve prior evidence.
- Credits are retained where present; dollar costs/basis stay null/unknown, including
  failed or ambiguous attempts. No implicit retries. Replay counts are not live costs.
- Provenance is authored `fixture`/`fixture_only`, with metadata/caption modalities
  only. Provider-supplied permission/instruction/media fields cannot promote it to
  live/approved or add video evidence. Returned captions remain inert untrusted text.

## Grounded DNA behavior and limits

The deterministic English baseline makes supported caption-topic observations,
tentative caption CTA interpretations, caption-question opening observations,
median reported duration and a descriptive view-count range when at least three
distinct videos have known counts. Repeated topic mentions can support an explicitly
**inferred intended-audience hypothesis**, never observed follower demographics or
interests. Every claim cites eligible observation IDs and explains uncertainty.

All observations remain in the scan. DNA summary statistics use one eligible
observation per video, selecting latest source time if known, otherwise retrieval
time, and breaking exact timestamp ties by observation ID. This is a deterministic
summary convention, not a truth-resolution rule. Counts taken at different times and
different post ages do not establish winning creative traits or causal improvement.

Unpermitted observations are excluded from analysis, and unsupported/no-match inputs
yield an empty claims array with a limitation. No visual, pacing, structure or
showcase analysis is generated. Caption openings are explicitly not video openings;
reported duration is not editing pace. Tests show that adding a pacing claim to a
caption-only envelope fails shared validation. Actual permitted video ingestion and
time-bounded video analysis remain prerequisites for implementing those dimensions;
this PR does not fake media evidence to fill them.

No model, retention/follower analytics, general semantic classification, ranking,
recommendation variants, DNA correction persistence or public tool is implemented.
DNA versions start at one; Bangkok owns save/correct/reopen, concurrency and append-only
version semantics. This baseline is useful for exercising shared data/evidence flow,
not a quality claim about the final recommendation engine.

## Remaining integration dependencies

- Bangkok: persist scan/observations/DNA and implement authorized operations, durable
  jobs, idempotency and correction/version handling against D0.
- Runtime provider/model access, separately authorized bounded live scan, permitted
  content/use/retention basis and authoritative cost allocation before live proof.
- Video evidence acquisition/analysis before visual or pacing claims; creative
  quality calibration and language expansion before broad audience recommendations.
- UI/Integration consume the existing shared analysis envelope; no new schemas,
  operation names or scopes are required/proposed by this PR.

No live provider/model calls, spending, deployment, hosted mutations, credential
changes or budget reservations occurred. Previous budget-reconciliation limits in
`D1-preparation.md` remain in force. Fixture, local runtime and actual hosted proof
must remain separate.

## Verified evidence

- Offline normalized fixture runner completed and emitted a valid complete analysis
  envelope: partial scan, one video, null follower/comments/shares and dollar costs,
  dated provenance, topic and duration claims. Output inspected locally.
- 23 dedicated creator-scan tests passed (14 new normalization/DNA tests).
- `npm run check` passed: 118 TypeScript tests, two browser suites, typechecking,
  dry-run Worker build and local workerd smoke.
- `git diff --check` passed. Shared contracts, shared fixtures, dependencies,
  application/database/auth/runtime and UI files are unchanged.
