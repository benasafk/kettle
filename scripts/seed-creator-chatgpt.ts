/** Explicit development-only fixture setup for the existing authenticated plugin.
 * Uses CLI-held service credentials in memory; no public ingestion/bypass endpoint.
 * Keeps stable request IDs locally so interrupted runs can be retried safely.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { Id, SaveProjectInput, SaveProjectOutput, GetAccountStateOutput } from '../packages/contracts/index.ts';
import { CreatorAnalysis } from '../packages/contracts/creator-profile.ts';
import { createCreatorIngestion } from '../packages/application/creator-operations.ts';
import { createSupabaseRepository } from '../packages/database/supabase.ts';
import { createCreatorSupabaseRepository } from '../packages/database/creator-supabase.ts';
import { normalizedAnalysisFixture } from '../evals/creator-loop/normalized-fixture.ts';
import { createInput } from '../tests/fixtures.ts';

assert.deepEqual(process.argv.slice(2), ['--execute'], 'Use --execute only for an authorized development account');
const project = process.env.KETTLE_TEST_PROJECT_REF;
assert.equal(project, 'fdicggstdtthfpcrpujf', 'Only the existing Kettle development project is supported');
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project,'Linked target mismatch');
const account = Id.parse(process.env.KETTLE_TEST_ACCOUNT_ID);
const file = '.context/creator-chatgpt-seed.json';
let seed: { account: string; project: string; brief: unknown; analysis: unknown; ingest_request_id: string };
try { seed = JSON.parse(await readFile(file,'utf8')); }
catch (error) {
  if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error;
  const analysis = normalizedAnalysisFixture();
  const remap = new Map<string,string>();
  for (const o of [...analysis.scan.profile_observations,...analysis.scan.video_observations]) { const id=crypto.randomUUID();remap.set(o.id,id);o.id=id; }
  analysis.scan.id=crypto.randomUUID();analysis.dna.id=crypto.randomUUID();analysis.dna.source_scan_id=analysis.scan.id;
  for (const c of analysis.dna.claims) {c.id=crypto.randomUUID();for(const e of c.evidence)e.observation_id=remap.get(e.observation_id)!;}
  const brief=createInput();brief.name='Creator DNA — fictional ChatGPT test';
  seed={account,project,brief,analysis:CreatorAnalysis.parse(analysis),ingest_request_id:crypto.randomUUID()};
  await writeFile(file,JSON.stringify(seed,null,2),{flag:'wx',mode:0o600});
}
assert.equal(seed.account,account,'Seed belongs to a different account; do not overwrite it');
assert.equal(seed.project,project);
const run=promisify(execFile);
let stdout: string;
try { ({stdout}=await run('node_modules/.bin/supabase',['projects','api-keys','--project-ref',project,'--output','json'],{timeout:60_000})); }
catch { throw new Error('Development service credentials unavailable; CLI output suppressed'); }
const keys=JSON.parse(stdout) as {name:string;api_key:string}[];
const key=keys.find(k=>k.name==='service_role')?.api_key;assert.ok(key,'Service key unavailable');
const base=`https://${project}.supabase.co`;
const repository=createSupabaseRepository(base,key);
const status=GetAccountStateOutput.parse(await repository.call('get_account_state',account,{}));
assert.ok(status.ok && status.data.account.state==='active','Existing active test account required');
const saved=SaveProjectOutput.parse(await repository.call('save_project',account,SaveProjectInput.parse(seed.brief)));
assert.ok(saved.ok,'Fixture project could not be saved');
const ingested=await createCreatorIngestion(createCreatorSupabaseRepository(base,key))(account,{
  project_id:saved.data.project.id,request_id:Id.parse(seed.ingest_request_id),analysis:CreatorAnalysis.parse(seed.analysis),
});
assert.ok(ingested.ok,'Fixture analysis could not be saved');
console.log(JSON.stringify({status:'saved fictional test data',account_id:account,project_id:saved.data.project.id,dna_id:ingested.data.dna_id,version:ingested.data.analysis.dna.version,provider_calls:0},null,2));
