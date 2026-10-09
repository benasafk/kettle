/** Explicit zero-dollar development allocation; secrets stay in CLI memory. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile,writeFile } from 'node:fs/promises';
import { GetAccountStateOutput, SaveProjectOutput } from '../packages/contracts/index.ts';
import { createSupabaseRepository } from '../packages/database/supabase.ts';
assert.deepEqual(process.argv.slice(2),['--execute']);
const project='fdicggstdtthfpcrpujf', account='c4e83ed5-41e7-4fc8-b3b7-eca3f3312c5d';
const profile='https://www.tiktok.com/@smartykalz';
assert.equal((await readFile('supabase/.temp/project-ref','utf8')).trim(),project);
let stdout:string;try{({stdout}=await promisify(execFile)('node_modules/.bin/supabase',['projects','api-keys','--project-ref',project,'--output','json'],{timeout:60000}));}catch{throw new Error('Development credential lookup failed; CLI output suppressed');}
const key=(JSON.parse(stdout) as {name:string;api_key:string}[]).find(k=>k.name==='service_role')?.api_key;assert.ok(key);
const base=`https://${project}.supabase.co`,repository=createSupabaseRepository(base,key);
const status=GetAccountStateOutput.parse(await repository.call('get_account_state',account,{}));assert.ok(status.ok&&status.data.account.state==='active');
async function rest(path:string,method='GET',body?:unknown,prefer?:string){
 const r=await fetch(`${base}/rest/v1/${path}`,{method,headers:{apikey:key!,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!r.ok)throw new Error(`Development allocation failed (${r.status}); response body suppressed`);
 const text=await r.text();return text?JSON.parse(text):null;
}
const budgets=await rest('creator_pipeline_budget?id=eq.1&select=limit_microusd,reserved_microusd');
assert.equal(budgets[0]?.limit_microusd,0,'Cash budget must remain zero');assert.equal(budgets[0]?.reserved_microusd,0);
const expires=new Date(Date.now()+12*3600000).toISOString();
// Ignore duplicates: rerunning never tops up or re-enables a consumed/disabled trial.
await rest('creator_provider_trials?on_conflict=provider','POST',[
 {provider:'scrapecreators',remaining_units:10,enabled:true,expires_at:expires},
 {provider:'lightreel',remaining_units:2,enabled:true,expires_at:expires},
],'resolution=ignore-duplicates');
await rest('creator_pipeline_allowances?on_conflict=account_id,profile_url','POST',{account_id:account,profile_url:profile,enabled:true,expires_at:expires},'resolution=ignore-duplicates');
const file='.context/creator-live-trial.json';let savedInput;
try{savedInput=JSON.parse(await readFile(file,'utf8'));}catch(e){if(!(e&&typeof e==='object'&&'code'in e&&e.code==='ENOENT'))throw e;
 savedInput={account_id:account,request:{request_id:crypto.randomUUID(),project_id:null,expected_version:0,name:'Creator review — @smartykalz',project_type:'brand',brief:{product:'Public creator profile review for @smartykalz.',audience:'To be established from bounded public evidence and creator corrections.',goal:'Find relevant video ideas and turn a selected idea into ready-to-film variants.',tone:'Clear and practical',language:'en',duration_seconds:30,filming_constraints:[],facts:[]}}};
 await writeFile(file,JSON.stringify(savedInput,null,2),{mode:0o600,flag:'wx'});
}
assert.equal(savedInput.account_id,account);
const saved=SaveProjectOutput.parse(await repository.call('save_project',account,savedInput.request));assert.ok(saved.ok);
const trials=await rest('creator_provider_trials?select=provider,remaining_units,enabled,expires_at');
console.log(JSON.stringify({account_id:account,project_id:saved.data.project.id,profile_url:profile,seed_url:'https://www.tiktok.com/@smartykalz/video/7685478377012071694',cash_budget_usd:0,trials},null,2));
