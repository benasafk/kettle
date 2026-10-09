-- Additive immutable supplied-video review; existing scans, versions and receipts stay unchanged.
create table public.creator_seed_reviews (
 profile_id uuid not null, account_id uuid not null, review jsonb not null check(jsonb_typeof(review)='object'),
 primary key(profile_id,account_id),
 foreign key(profile_id,account_id) references public.creator_profiles(id,account_id),
 check(review->>'provider'='lightreel' and review->>'url'=review#>>'{provenance,source_url}')
);
alter table public.creator_seed_reviews enable row level security;
revoke all on public.creator_seed_reviews from public,anon,authenticated,service_role;
grant select,insert on public.creator_seed_reviews to service_role;

create or replace function public.kettle_get_creator_dna(p_account_id uuid, p_input jsonb) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select case when not exists (select 1 from public.accounts where id=p_account_id and state='active')
    then public.kettle_error('FORBIDDEN') else coalesce((
      select jsonb_build_object('ok',true,'data',jsonb_build_object(
        'dna_id',p.id,'project_id',p.project_id,'analysis',(jsonb_build_object('scan',s.scan,'dna',v.snapshot) || case when r.review is null then '{}'::jsonb else jsonb_build_object('seed_review',r.review) end)))
      from public.creator_profiles p
      join public.creator_scans s on (s.profile_id,s.account_id)=(p.id,p.account_id)
      join public.creator_dna_versions v on (v.profile_id,v.account_id,v.version)=
        (p.id,p.account_id,coalesce((p_input->>'version')::integer,p.current_version))
      left join public.creator_seed_reviews r on (r.profile_id,r.account_id)=(p.id,p.account_id)
      where p.id=(p_input->>'dna_id')::uuid and p.account_id=p_account_id
    ),public.kettle_error('NOT_FOUND')) end;
$$;

create or replace function public.kettle_ingest_creator_analysis(p_account_id uuid, p_input jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  r public.creator_write_receipts%rowtype;
  req uuid := (p_input->>'request_id')::uuid;
  dna jsonb := p_input#>'{analysis,dna}';
  scan jsonb := p_input#>'{analysis,scan}';
  pid uuid := (p_input->>'project_id')::uuid;
  did uuid := (dna->>'id')::uuid;
  output jsonb;
begin
  perform 1 from public.accounts where id=p_account_id and state='active' for update;
  if not found then return public.kettle_error('FORBIDDEN'); end if;
  select * into r from public.creator_write_receipts where account_id=p_account_id and request_id=req;
  if found then
    if r.operation='ingest_creator_analysis' and r.input=p_input then return r.output; end if;
    return public.kettle_error('IDEMPOTENCY_CONFLICT');
  end if;
  perform 1 from public.projects where id=pid and account_id=p_account_id;
  if not found then return public.kettle_error('NOT_FOUND'); end if;
  if req is null or did is null or scan is null or dna is null or
    dna->>'version' is distinct from '1' or dna->>'source_scan_id' is distinct from scan->>'id' or
    dna->'profile' is distinct from scan->'profile' then return public.kettle_error('VALIDATION_ERROR'); end if;
  -- Collision is not an update path, and leaks no existing owner/version.
  if exists (select 1 from public.creator_profiles where id=did) then return public.kettle_error('VALIDATION_ERROR'); end if;
  insert into public.creator_profiles(id,account_id,project_id,platform,native_id,current_version)
    values(did,p_account_id,pid,dna#>>'{profile,platform}',dna#>>'{profile,native_id}',1);
  insert into public.creator_scans(profile_id,account_id,scan_id,scan)
    values(did,p_account_id,(scan->>'id')::uuid,scan);
  insert into public.creator_dna_versions(profile_id,account_id,version,snapshot) values(did,p_account_id,1,dna);
  if p_input#>'{analysis,seed_review}' is not null then
    insert into public.creator_seed_reviews(profile_id,account_id,review) values(did,p_account_id,p_input#>'{analysis,seed_review}');
  end if;
  output := public.kettle_get_creator_dna(p_account_id,jsonb_build_object('dna_id',did));
  insert into public.creator_write_receipts(account_id,request_id,operation,input,output)
    values(p_account_id,req,'ingest_creator_analysis',p_input,output);
  return output;
end;
$$;

