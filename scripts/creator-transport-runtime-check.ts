/** Local workerd regression: exercise Request construction, never external I/O. */
import { createPipelineSupabaseRepository } from '../packages/database/creator-pipeline-supabase.ts';
import { boundedJson } from '../packages/adapters/creator-pipeline/http.ts';
export async function runCreatorTransportRuntimeCheck() {
  let requests=0;
  const transport:typeof fetch=async(input,init)=>{
    const request=new Request(input,init);
    if(request.redirect!=='manual')throw new Error('Redirect must not forward credentials');
    requests++;
    return Response.json({ok:true});
  };
  const repository=createPipelineSupabaseRepository('https://fixture.supabase.co','fixture-only',transport);
  await repository.call('get_creator_job','00000000-0000-4000-8000-000000000001',{});
  const response=await boundedJson(transport,new URL('https://api.scrapecreators.com/v1/tiktok/profile'),{headers:{'x-api-key':'fixture-only'}},{timeoutMs:1000});
  if(response.failure!==null||requests!==2)throw new Error('Provider transport failed in workerd');
  const redirected=await boundedJson(async(input,init)=>{
    const request=new Request(input,init);
    if(request.redirect!=='manual')throw new Error('Redirect mode changed');
    return Response.redirect('https://untrusted.example',302);
  },new URL('https://api.lightreel.ai/v1/chat'),{method:'POST'},{timeoutMs:1000});
  if(redirected.failure!=='http'||redirected.status!==302)throw new Error('Provider redirect accepted');
  return {status:'passed',fixture:true};
}
