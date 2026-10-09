/** Shared UI/Integration preview fixtures. Authored data, never runtime fallback. */
import { creatorAnalysisFixture } from '../../packages/contracts/fixtures/creator-profile.ts';
import { projectCreatorDna } from '../../packages/application/creator-operations.ts';
export function creatorDnaViewFixture() {
  const analysis = creatorAnalysisFixture();
  return projectCreatorDna({ dna_id: analysis.dna.id,
    project_id: '00000000-0000-4000-8000-000000000100', analysis });
}
