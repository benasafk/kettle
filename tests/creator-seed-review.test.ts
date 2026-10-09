import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creatorAnalysisFixture } from '../packages/contracts/fixtures/creator-profile.ts';
import { CreatorAnalysis } from '../packages/contracts/creator-profile.ts';
import { projectCreatorDna } from '../packages/application/creator-operations.ts';
import { canProcessCapturedDna } from '../packages/application/creator-pipeline.ts';

function storedReview(){
  const analysis=creatorAnalysisFixture();
  for(const o of [...analysis.scan.profile_observations,...analysis.scan.video_observations]){
    o.provenance.origin='live';o.provenance.permission.status='approved';
  }
  const url=analysis.scan.request.supplied_url+'/video/12345';
  analysis.seed_review={url,provider:'lightreel',conversation_id:'private-provider-conversation',
    summary:'Provider-authored interpretation of the supplied video.',access_basis:'video_access_reported',
    limitations:['Reported access is not independently verified.'],provenance:{...structuredClone(analysis.scan.profile_observations[0]!.provenance),provider:'lightreel',source_url:url,endpoint:'/v1/chat',modalities:['metadata']}};
  return {dna_id:analysis.dna.id,project_id:crypto.randomUUID(),analysis:CreatorAnalysis.parse(analysis)};
}
test('Lightreel review remains separate from DNA claims and exposes only permitted public fields',()=>{
  const stored=storedReview(),view=projectCreatorDna(stored);
  assert.deepEqual(view.claims,stored.analysis.dna.claims);
  assert.equal(view.seed_review?.access_basis,'video_access_reported');
  assert.equal(view.seed_review?.provider,'lightreel');
  assert.ok(!JSON.stringify(view).includes('private-provider-conversation'));
  assert.ok(!JSON.stringify(view).includes('permitted_uses'));
  assert.equal(canProcessCapturedDna(stored,view),true);
  stored.analysis.seed_review!.provenance.permission.permitted_uses=['store','display'];
  assert.equal(canProcessCapturedDna(stored,projectCreatorDna(stored)),false);
});
test('review display and model permissions are independent, foreign video attribution fails',()=>{
  const stored=storedReview();
  stored.analysis.seed_review!.provenance.permission.permitted_uses=['store','model_processing'];
  assert.equal(projectCreatorDna(stored).seed_review,undefined);
  stored.analysis.seed_review!.url='https://www.tiktok.com/@other/video/12345';
  stored.analysis.seed_review!.provenance.source_url=stored.analysis.seed_review!.url;
  assert.equal(CreatorAnalysis.safeParse(stored.analysis).success,false);
});
