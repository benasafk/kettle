-- Lead-owned additive migration. Account-owned analyses; no social ownership claim.
create table public.creator_profiles (
  id uuid primary key,
  account_id uuid not null references public.accounts(id),
  project_id uuid not null,
  platform text not null check (platform in ('tiktok','instagram')),
  native_id text not null check (length(native_id) between 1 and 200),
  current_version integer not null check (current_version > 0),
  unique (id, account_id),
  foreign key (project_id, account_id) references public.projects(id, account_id)
);
create index creator_profiles_owner on public.creator_profiles(account_id, project_id);
create table public.creator_scans (
  profile_id uuid not null,
  account_id uuid not null,
  scan_id uuid not null,
  scan jsonb not null check (jsonb_typeof(scan) = 'object'),
  check ((scan->>'id')::uuid = scan_id),
  primary key (profile_id, account_id),
  foreign key (profile_id, account_id) references public.creator_profiles(id, account_id)
);
create table public.creator_dna_versions (
  profile_id uuid not null,
  account_id uuid not null,
  version integer not null check (version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  check ((snapshot->>'version')::integer = version),
  primary key (profile_id, account_id, version),
  foreign key (profile_id, account_id) references public.creator_profiles(id, account_id)
);
alter table public.creator_profiles add constraint creator_current_dna
  foreign key (id, account_id, current_version) references public.creator_dna_versions(profile_id, account_id, version)
  deferrable initially deferred;
-- Separate creator-operation namespace; ID collision across creator writes conflicts.
create table public.creator_write_receipts (
  account_id uuid not null references public.accounts(id), request_id uuid not null,
  operation text not null check (operation in ('ingest_creator_analysis','correct_creator_dna')),
  input jsonb not null, output jsonb not null, created_at timestamptz not null default now(),
  primary key (account_id, request_id)
);
alter table public.creator_profiles enable row level security;
alter table public.creator_scans enable row level security;
alter table public.creator_dna_versions enable row level security;
alter table public.creator_write_receipts enable row level security;
revoke all on public.creator_profiles, public.creator_scans, public.creator_dna_versions, public.creator_write_receipts from public, anon, authenticated, service_role;
grant select, insert on public.creator_profiles, public.creator_scans, public.creator_dna_versions, public.creator_write_receipts to service_role;
grant update(current_version) on public.creator_profiles to service_role;

create function public.kettle_get_creator_dna(p_account_id uuid, p_input jsonb) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select case when not exists (select 1 from public.accounts where id=p_account_id and state='active')
    then public.kettle_error('FORBIDDEN') else coalesce((
      select jsonb_build_object('ok',true,'data',jsonb_build_object(
        'dna_id',p.id,'project_id',p.project_id,'analysis',jsonb_build_object('scan',s.scan,'dna',v.snapshot)))
      from public.creator_profiles p
      join public.creator_scans s on (s.profile_id,s.account_id)=(p.id,p.account_id)
      join public.creator_dna_versions v on (v.profile_id,v.account_id,v.version)=
        (p.id,p.account_id,coalesce((p_input->>'version')::integer,p.current_version))
      where p.id=(p_input->>'dna_id')::uuid and p.account_id=p_account_id
    ),public.kettle_error('NOT_FOUND')) end;
$$;

create function public.kettle_ingest_creator_analysis(p_account_id uuid, p_input jsonb) returns jsonb
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
  output := public.kettle_get_creator_dna(p_account_id,jsonb_build_object('dna_id',did));
  insert into public.creator_write_receipts(account_id,request_id,operation,input,output)
    values(p_account_id,req,'ingest_creator_analysis',p_input,output);
  return output;
end;
$$;

create function public.kettle_correct_creator_dna(p_account_id uuid, p_input jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  r public.creator_write_receipts%rowtype;
  req uuid := (p_input->>'request_id')::uuid;
  did uuid := (p_input->>'dna_id')::uuid;
  current_v integer;
  dna jsonb;
  claims jsonb := '[]'::jsonb;
  claim jsonb;
  correction jsonb;
  output jsonb;
begin
  perform 1 from public.accounts where id=p_account_id and state='active' for update;
  if not found then return public.kettle_error('FORBIDDEN'); end if;
  select * into r from public.creator_write_receipts where account_id=p_account_id and request_id=req;
  if found then
    if r.operation='correct_creator_dna' and r.input=p_input then return r.output; end if;
    return public.kettle_error('IDEMPOTENCY_CONFLICT');
  end if;
  select current_version into current_v from public.creator_profiles where id=did and account_id=p_account_id for update;
  if not found then return public.kettle_error('NOT_FOUND'); end if;
  if current_v is distinct from (p_input->>'expected_version')::integer then return public.kettle_error('VERSION_CONFLICT'); end if;
  if req is null or jsonb_typeof(p_input->'corrections') is distinct from 'array' then return public.kettle_error('VALIDATION_ERROR'); end if;
  if jsonb_array_length(p_input->'corrections') not between 1 and 100 or current_v>=2147483646 then return public.kettle_error('VALIDATION_ERROR'); end if;
  select snapshot into dna from public.creator_dna_versions where profile_id=did and account_id=p_account_id and version=current_v;
  if (select count(*) from jsonb_array_elements(p_input->'corrections')) <>
     (select count(distinct c->>'claim_id') from jsonb_array_elements(p_input->'corrections') c) then return public.kettle_error('VALIDATION_ERROR'); end if;
  for correction in select value from jsonb_array_elements(p_input->'corrections') loop
    if correction->>'statement' is null or length(btrim(correction->>'statement')) not between 1 and 2000 or
      not exists(select 1 from jsonb_array_elements(dna->'claims') c where c->>'id'=correction->>'claim_id') then
      return public.kettle_error('VALIDATION_ERROR');
    end if;
  end loop;
  for claim in select value from jsonb_array_elements(dna->'claims') loop
    select value into correction from jsonb_array_elements(p_input->'corrections') where value->>'claim_id'=claim->>'id';
    if found then
      claim := claim || jsonb_build_object('id',gen_random_uuid(),'supersedes_claim_id',claim->>'id',
        'statement',btrim(correction->>'statement'),'basis','user_corrected',
        'method','User correction; original evidence retained.',
        'uncertainty','User-supplied correction; not independently verified.');
    end if;
    claims := claims || jsonb_build_array(claim);
  end loop;
  dna := dna || jsonb_build_object('id',gen_random_uuid(),'version',current_v+1,'created_at',now(),'claims',claims);
  insert into public.creator_dna_versions(profile_id,account_id,version,snapshot) values(did,p_account_id,current_v+1,dna);
  update public.creator_profiles set current_version=current_v+1 where id=did and account_id=p_account_id;
  output := public.kettle_get_creator_dna(p_account_id,jsonb_build_object('dna_id',did));
  insert into public.creator_write_receipts(account_id,request_id,operation,input,output)
    values(p_account_id,req,'correct_creator_dna',p_input,output);
  return output;
end;
$$;
revoke all on function public.kettle_get_creator_dna(uuid,jsonb), public.kettle_ingest_creator_analysis(uuid,jsonb), public.kettle_correct_creator_dna(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.kettle_get_creator_dna(uuid,jsonb), public.kettle_ingest_creator_analysis(uuid,jsonb), public.kettle_correct_creator_dna(uuid,jsonb) to service_role;
