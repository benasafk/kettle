import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCreatorSupabaseRepository } from '../packages/database/creator-supabase.ts';

test('creator adapter uses allowlisted service-role RPC with explicit owner and no redirects/retries', async () => {
  let calls=0;
  const fetcher: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(String(url),'https://example.supabase.co/rest/v1/rpc/kettle_get_creator_dna');
    assert.equal(init?.redirect,'manual');
    assert.ok(init?.signal);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'),'Bearer fixture-secret');
    assert.deepEqual(JSON.parse(String(init?.body)),{p_account_id:'verified-owner',p_input:{dna_id:'fixture-id'}});
    return new Response(JSON.stringify({ok:false,error:{code:'NOT_FOUND'}}),{headers:{'Content-Type':'application/json'}});
  };
  const repository=createCreatorSupabaseRepository('https://example.supabase.co','fixture-secret',fetcher);
  assert.deepEqual(await repository.call('get_creator_dna','verified-owner',{dna_id:'fixture-id'}),{ok:false,error:{code:'NOT_FOUND'}});
  assert.equal(calls,1);
  const fail=createCreatorSupabaseRepository('https://example.supabase.co','fixture-secret',async()=>{calls++;return new Response('private provider/database body',{status:500});});
  await assert.rejects(fail.call('get_creator_dna','verified-owner',{}),/^Error: Creator storage unavailable$/);
  assert.equal(calls,2);
  assert.throws(()=>createCreatorSupabaseRepository('http://remote.test','fixture-secret'));
});
