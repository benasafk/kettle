# Creator pipeline integration baseline — 2026-10-09

The user requests the TikTok-to-script journey through the existing Kettle plugin.
This increment supplies executable shared interfaces; it does not claim a working
job runner or live provider proof. Existing DNA persistence and correction remain.

## Shared exports

`packages/contracts/creator-pipeline.ts` owns the provider port, public job view,
recommendation batches, script sets and start/read operation schemas. Fictional
examples are in `evals/creator-loop/pipeline-fixtures.ts`. Do not duplicate schemas.
The first proof returns zero to three ideas and two or three variants per selection.
An empty evidence-backed batch is valid; never fabricate references to fill cards.

Generation implements `CreatorPipelineProvider` under
`packages/adapters/creator-pipeline/`. Its methods are `scan(request, context)`,
`recommend(dna, context)` and `generate({batch, idea_id, dna}, context)`.
Every external HTTP request uses the following trusted context method:

```ts
call(
  key: string,
  provider: 'scrapecreators' | 'lightreel' | 'openai',
  operation: 'profile' | 'feed' | 'research' | 'poll' | 'video' | 'generate',
  execute: () => Promise<unknown>
): Promise<unknown>
```

Keys identify a stable logical request within one job. The lead runner must reserve
its configured cost ceiling before executing the closure, persist sanitized successful
responses for replay, and block repeated attempts after an ambiguous outcome. This is
an implementation requirement, not a claim that the guard is implemented. The closure
must contain exactly one bounded request, including response decoding, and throw on
HTTP failure. No adapter-level retries or additional requests inside the closure.
No credentials, request headers, or raw error bodies in persisted/logged errors.
Response data remains untrusted and requires adapter validation after the guard.

Lightreel research uses one blocking submission. Retain a returned conversation ID;
subsequent bounded history reads may use that known ID. Do not invent an asynchronous
job-status protocol or resubmit a timed-out POST. ScrapeCreators video detail explicitly
disables media downloads; no transcript/media or audience-demographics expansion.
Initial runtime policy will cap scans at ten videos/two feed pages and enrichment at
three distinct references. Backend access, permitted uses and provider costs must be
verified before enabling live execution.

## Workspace assignments

- **Generation:** injectable HTTP transports, bounded provider adapter, provenance,
  grounding and dedicated mocked tests. Read shared interfaces; no live calls yet.
- **UI:** component under `apps/panel/creator-pipeline/`, rendering `CreatorJobView`
  with waiting, failed/reconciliation, DNA completion, recommendation and script
  views. Export `mountCreatorPipeline(root)` returning `render(job)` and `dispose()`.
  This increment uses chat instructions to select/generate; no implicit paid action
  from render, refresh or reopen. No provider or host networking in the component.
- **Integration:** controller and bridge under `apps/panel/creator-pipeline-controller.ts`
  and `creator-pipeline-bridge.ts`. Consume structured `CreatorJobOutput`, use
  `get_creator_job` for bounded refresh, clear on auth denial, reject wrong IDs and
  lower revisions, and stop polling terminal states. Propose resource/MCP wiring;
  Bangkok owns shared worker/build registration. Component export as above.
- **Auth:** review the public job ownership/scope and replay-denial test matrix.
  Concrete tests follow the lead application/repository implementation; no shared
  application, migration or runtime edits.
- **Bangkok:** persistence, durable attempt/budget guard, Workflows, trusted provider
  composition, MCP registration, build, review/merge and deployment coordination.

Start operations require verified project-write authority plus a separate server-side
research allowance; the OAuth scope alone grants no research budget. Read/refresh
uses project-read authority and never starts a provider request. Selection is explicit
in `start_creator_scripts` and binds an immutable batch, idea and DNA version.
Runtime must validate output lineage against those captured inputs before persistence.
Job results are present only on successful jobs; job revisions increase monotonically.

## Live proof target and outstanding gates

User supplied `https://www.tiktok.com/@smartykalz/video/7685478377012071694`.
Canonical profile: `https://www.tiktok.com/@smartykalz`. Preserve the video as a
starting reference; do not assume it is in the bounded recent feed. URL identity does
not prove ownership or permission. Actual returned coverage must be recorded.

The historical $25 aggregate cap still applies. Trial expiry, remaining credits,
prior charges/reservations, backend credentials and usage basis remain unverified.
This interface baseline allocates no spending, changes no secrets, and deploys nothing.
Mocked contract/adapter tests, hosted storage tests and the actual ChatGPT journey
must be reported separately.
