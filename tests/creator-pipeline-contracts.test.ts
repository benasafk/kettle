import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RecommendationBatch, CreatorScriptSet, CreatorJobView } from '../packages/contracts/creator-pipeline.ts';
import { recommendationBatchFixture, creatorScriptsFixture, creatorJobFixture } from '../evals/creator-loop/pipeline-fixtures.ts';
test('pipeline contracts retain reference lineage and fictional origin without padding',()=>{
 const batch=recommendationBatchFixture(); assert.equal(batch.ideas.length,1);
 assert.ok(!RecommendationBatch.safeParse({...batch,contains_fixture_data:false}).success);
 assert.ok(!RecommendationBatch.safeParse({...batch,references:[]}).success);
 assert.ok(!RecommendationBatch.safeParse({...batch,references:[...batch.references,...batch.references]}).success);
 assert.ok(!RecommendationBatch.safeParse({...batch,ideas:[...batch.ideas,...batch.ideas]}).success);
 assert.ok(RecommendationBatch.safeParse({...batch,references:[],ideas:[]}).success);
 const scripts=creatorScriptsFixture(); assert.equal(scripts.variants.length,2);
 assert.ok(!CreatorScriptSet.safeParse({...scripts,variants:[scripts.variants[0]]}).success);
 assert.ok(!CreatorScriptSet.safeParse({...scripts,variants:[scripts.variants[0],scripts.variants[0]]}).success);
 for(const kind of ['scan','recommendations','scripts'] as const)assert.equal(creatorJobFixture(kind).result!.kind,kind);
});
test('job status cannot expose premature, mismatched or cross-project scan results', () => {
 const job = creatorJobFixture('scan');
 assert.ok(!CreatorJobView.safeParse({...job, state: 'running'}).success);
 assert.ok(!CreatorJobView.safeParse({...job, result: null}).success);
 assert.ok(!CreatorJobView.safeParse({...job, kind: 'scripts'}).success);
 assert.ok(!CreatorJobView.safeParse({...job, project_id: job.id}).success);
 assert.ok(CreatorJobView.safeParse({...job, state: 'queued', result: null}).success);
});
