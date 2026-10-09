/** Offline integration evidence only. There is no live mode and no env/credential lookup. */
import { createCreatorPipelineProvider } from '../../packages/adapters/creator-pipeline/provider.ts';
import { projectCreatorDna } from '../../packages/application/creator-operations.ts';
import { fakeGuard, providerHttpFixture } from './provider-http-fixtures.ts';
if (process.argv.length > 2) throw new Error('This evaluation has no arguments or live mode');
const fixture = providerHttpFixture();
const provider = createCreatorPipelineProvider(fixture.options);
const scanGuard = fakeGuard();
const analysis = await provider.scan(fixture.input.request, scanGuard.context);
const dna = projectCreatorDna({ dna_id: analysis.dna.id,
  project_id: '00000000-0000-4000-8000-000000000100', analysis });
const referenceGuard = fakeGuard();
const batch = await provider.recommend(dna, referenceGuard.context);
const generationGuard = fakeGuard();
const scripts = await provider.generate({ batch, idea_id: batch.ideas[0]!.id, dna }, generationGuard.context);
console.log(JSON.stringify({ evidence: 'synthetic_injected_http_only', live_provider_requests: 0,
  scan: { unique_videos: analysis.scan.coverage.unique_videos, status: analysis.scan.status, claims: dna.claims.length },
  references: batch.references.length, ideas: batch.ideas.length, variants: scripts.variants.length,
  guarded_operations: [...scanGuard.calls, ...referenceGuard.calls, ...generationGuard.calls].map(c => c.operation),
  cost: 'No real provider calls; fixture token/credit counts are not billing evidence.',
  limitations: ['Exercises live mapping using fictional data; does not verify provider access, semantic quality, rights, durable concurrency or the ChatGPT journey.'],
}, null, 2));
