-- Durable creator jobs and conservative paid-attempt reservations. No paid allowance is seeded.
create table public.creator_jobs (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id),
 project_id uuid not null, kind text not null check(kind in ('scan','recommendations','scripts')),
 state text not null default 'queued' check(state in ('queued','running','succeeded','failed','needs_reconciliation')),
 revision integer not null default 1 check(revision>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 input jsonb not null, captured jsonb not null, result jsonb, message text check(length(message)<=1000), request_id uuid not null,
 unique(account_id,request_id), unique(id,account_id), foreign key(project_id,account_id) references public.projects(id,account_id),
 check(jsonb_typeof(input)='object' and jsonb_typeof(captured)='object'),
 check((state='succeeded' and result is not null and (result->>'kind') is not distinct from kind) or (state<>'succeeded' and result is null))
);
create index creator_jobs_dispatch on public.creator_jobs(state,created_at);
create table public.creator_job_events (
 job_id uuid not null references public.creator_jobs(id), revision integer not null, state text not null,
 result jsonb, message text, created_at timestamptz not null default now(), primary key(job_id,revision)
);
create table public.creator_pipeline_budget (
 id integer primary key check(id=1), limit_microusd bigint not null default 0 check(limit_microusd>=0),
 reserved_microusd bigint not null default 0 check(reserved_microusd>=0 and reserved_microusd<=limit_microusd)
);
insert into public.creator_pipeline_budget(id) values(1);
create table public.creator_pipeline_allowances (
 account_id uuid not null references public.accounts(id), profile_url text not null,
 enabled boolean not null default false, expires_at timestamptz not null, primary key(account_id,profile_url)
);
-- Explicit free-trial request units, never inferred from a dollar conversion.
create table public.creator_provider_trials (
 provider text primary key check(provider in ('scrapecreators','lightreel')),
 remaining_units bigint not null check(remaining_units>=0), enabled boolean not null default false,
 expires_at timestamptz not null
);
create table public.creator_attempts (
 job_id uuid not null references public.creator_jobs(id), key text not null check(length(key) between 1 and 200),
 provider text not null, operation text not null, ceiling_microusd bigint not null check(ceiling_microusd>=0),
 created_at timestamptz not null default now(), primary key(job_id,key),
 check((provider='scrapecreators' and operation in ('profile','feed','video')) or
       (provider='lightreel' and operation in ('research','poll')) or (provider='openai' and operation='generate'))
);
create table public.creator_attempt_receipts (
 job_id uuid not null, key text not null, receipt jsonb not null check(octet_length(receipt::text)<=307200),
 created_at timestamptz not null default now(), primary key(job_id,key), foreign key(job_id,key) references public.creator_attempts(job_id,key)
);
-- Revoke default Supabase grants before granting the minimal invoker privileges.
alter table public.creator_jobs enable row level security;
alter table public.creator_job_events enable row level security;
alter table public.creator_pipeline_budget enable row level security;
alter table public.creator_pipeline_allowances enable row level security;
alter table public.creator_provider_trials enable row level security;
alter table public.creator_attempts enable row level security;
alter table public.creator_attempt_receipts enable row level security;
revoke all on public.creator_jobs,public.creator_job_events,public.creator_pipeline_budget,public.creator_pipeline_allowances,public.creator_provider_trials,public.creator_attempts,public.creator_attempt_receipts from public,anon,authenticated,service_role;
grant select,insert on public.creator_jobs,public.creator_job_events,public.creator_attempts,public.creator_attempt_receipts to service_role;
grant update(state,revision,updated_at,result,message) on public.creator_jobs to service_role;
grant select,insert,update on public.creator_pipeline_budget,public.creator_pipeline_allowances,public.creator_provider_trials to service_role;

create function public.kettle_creator_job_history() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if old.state in ('succeeded','failed','needs_reconciliation') or
    new.input is distinct from old.input or new.captured is distinct from old.captured or new.request_id<>old.request_id or
    new.account_id<>old.account_id or new.project_id<>old.project_id or new.kind<>old.kind or new.id<>old.id or new.created_at<>old.created_at or
    new.revision<>old.revision+1 or not ((old.state='queued' and new.state in ('running','failed','needs_reconciliation')) or
      (old.state='running' and new.state in ('succeeded','failed','needs_reconciliation'))) then
   raise exception 'immutable creator job or invalid transition';
  end if;
 end if;
 insert into public.creator_job_events(job_id,revision,state,result,message) values(new.id,new.revision,new.state,new.result,new.message);
 return new;
end; $$;
create trigger creator_job_history after insert or update on public.creator_jobs for each row execute function public.kettle_creator_job_history();

create function public.kettle_creator_profile_url(p_captured jsonb) returns text language sql immutable security invoker set search_path='' as $$
 select coalesce(p_captured#>>'{scan,supplied_url}',p_captured#>>'{stored,analysis,scan,request,supplied_url}');
$$;
create function public.kettle_get_creator_job(p_account_id uuid,p_input jsonb) returns jsonb language sql stable security invoker set search_path='' as $$
 select case when not exists(select 1 from public.accounts where id=p_account_id and state='active') then public.kettle_error('FORBIDDEN')
 else coalesce((select jsonb_build_object('ok',true,'data',jsonb_build_object('job',to_jsonb(j))) from public.creator_jobs j
 join public.projects p on (p.id,p.account_id)=(j.project_id,j.account_id) where j.id=(p_input->>'job_id')::uuid and j.account_id=p_account_id),public.kettle_error('NOT_FOUND')) end;
$$;
create function public.kettle_start_creator_job(p_account_id uuid,p_input jsonb,p_kind text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.creator_jobs%rowtype; parent public.creator_jobs%rowtype; stored jsonb; captured jsonb; pid uuid; req uuid:=(p_input->>'request_id')::uuid; url text;
begin
 perform 1 from public.accounts where id=p_account_id and state='active' for update;
 if not found then return public.kettle_error('FORBIDDEN'); end if;
 select * into j from public.creator_jobs where account_id=p_account_id and request_id=req;
 if found then
  if j.kind<>p_kind or j.input<>p_input then return public.kettle_error('IDEMPOTENCY_CONFLICT'); end if;
  return public.kettle_get_creator_job(p_account_id,jsonb_build_object('job_id',j.id));
 end if;
 if req is null then return public.kettle_error('VALIDATION_ERROR'); end if;
 if p_kind='scan' then
  pid:=(p_input->>'project_id')::uuid;
  captured:=jsonb_build_object('scan',p_input->'scan');
  if p_input ? 'seed_url' then captured:=captured||jsonb_build_object('seed_url',p_input->'seed_url'); end if;
 elsif p_kind='recommendations' then
  stored:=public.kettle_get_creator_dna(p_account_id,jsonb_build_object('dna_id',p_input->>'dna_id'));
  if stored->>'ok'<>'true' then return stored; end if;
  stored:=stored->'data';
  if (stored#>>'{analysis,dna,version}')::integer is distinct from (p_input->>'expected_version')::integer then return public.kettle_error('VERSION_CONFLICT'); end if;
  pid:=(stored->>'project_id')::uuid; captured:=jsonb_build_object('stored',stored);
 elsif p_kind='scripts' then
  select * into parent from public.creator_jobs where account_id=p_account_id and kind='recommendations' and state='succeeded' and result#>>'{batch,id}'=p_input->>'batch_id';
  if not found then return public.kettle_error('NOT_FOUND'); end if;
  if not exists(select 1 from jsonb_array_elements(parent.result#>'{batch,ideas}') i where i->>'id'=p_input->>'idea_id') then return public.kettle_error('NOT_FOUND'); end if;
  pid:=parent.project_id; captured:=jsonb_build_object('stored',parent.captured->'stored','batch',parent.result->'batch','idea_id',p_input->>'idea_id');
  if p_input ? 'variants' then captured:=captured||jsonb_build_object('variants',p_input->'variants'); end if;
 else return public.kettle_error('VALIDATION_ERROR'); end if;
 perform 1 from public.projects where id=pid and account_id=p_account_id;
 if not found then return public.kettle_error('NOT_FOUND'); end if;
 url:=public.kettle_creator_profile_url(captured);
 perform 1 from public.creator_pipeline_allowances where account_id=p_account_id and profile_url=url and enabled and expires_at>now() for share;
 if not found then return public.kettle_error('FORBIDDEN'); end if;
 insert into public.creator_jobs(account_id,project_id,kind,input,captured,request_id) values(p_account_id,pid,p_kind,p_input,captured,req) returning * into j;
 return jsonb_build_object('ok',true,'data',jsonb_build_object('job',to_jsonb(j)));
end; $$;
create function public.kettle_start_creator_scan(p_account_id uuid,p_input jsonb) returns jsonb language sql security invoker set search_path='' as $$ select public.kettle_start_creator_job(p_account_id,p_input,'scan'); $$;
create function public.kettle_start_creator_recommendations(p_account_id uuid,p_input jsonb) returns jsonb language sql security invoker set search_path='' as $$ select public.kettle_start_creator_job(p_account_id,p_input,'recommendations'); $$;
create function public.kettle_start_creator_scripts(p_account_id uuid,p_input jsonb) returns jsonb language sql security invoker set search_path='' as $$ select public.kettle_start_creator_job(p_account_id,p_input,'scripts'); $$;

-- ChatGPT-authored variants share the script-stage request namespace and immutable capture.
create function public.kettle_save_creator_scripts(p_account_id uuid,p_input jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if jsonb_typeof(p_input->'variants') is distinct from 'array' then return public.kettle_error('VALIDATION_ERROR'); end if;
 if jsonb_array_length(p_input->'variants') not between 2 and 3 then return public.kettle_error('VALIDATION_ERROR'); end if;
 return public.kettle_start_creator_job(p_account_id,p_input,'scripts');
end; $$;

create function public.kettle_run_creator_job(p_account_id uuid,p_input jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.creator_jobs%rowtype;
begin
 perform 1 from public.accounts where id=p_account_id and state='active' for update;
 if not found then return public.kettle_error('FORBIDDEN'); end if;
 select * into j from public.creator_jobs where id=(p_input->>'job_id')::uuid and account_id=p_account_id for update;
 if not found then return public.kettle_error('NOT_FOUND'); end if;
 if j.state='queued' then
  perform 1 from public.creator_pipeline_allowances where account_id=p_account_id and profile_url=public.kettle_creator_profile_url(j.captured) and enabled and expires_at>now() for share;
  if not found then return public.kettle_error('FORBIDDEN'); end if;
  update public.creator_jobs set state='running',revision=revision+1,updated_at=now() where id=j.id returning * into j;
 end if;
 return jsonb_build_object('ok',true,'data',jsonb_build_object('job',to_jsonb(j)));
end; $$;
create function public.kettle_finish_creator_job(p_account_id uuid,p_input jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.creator_jobs%rowtype; s text:=p_input->>'state'; r jsonb:=nullif(p_input->'result','null'::jsonb); m text:=p_input->>'message';
begin
 perform 1 from public.accounts where id=p_account_id and state='active' for update;
 if not found then return public.kettle_error('FORBIDDEN'); end if;
 select * into j from public.creator_jobs where id=(p_input->>'job_id')::uuid and account_id=p_account_id for update;
 if not found then return public.kettle_error('NOT_FOUND'); end if;
 if s is null or s not in ('succeeded','failed','needs_reconciliation') or length(m)>1000 or
    (s='succeeded' and (r is null or r->>'kind' is distinct from j.kind)) or (s<>'succeeded' and r is not null) then return public.kettle_error('VALIDATION_ERROR'); end if;
 if j.state in ('succeeded','failed','needs_reconciliation') then
  if j.state<>s or j.result is distinct from r or j.message is distinct from m then return public.kettle_error('IDEMPOTENCY_CONFLICT'); end if;
 elsif j.state='queued' and s='succeeded' then return public.kettle_error('VALIDATION_ERROR');
 elsif s='succeeded' and exists (
  select 1 from public.creator_attempts a left join public.creator_attempt_receipts ar on (ar.job_id,ar.key)=(a.job_id,a.key)
  where a.job_id=j.id and ar.job_id is null
 ) then return public.kettle_error('FORBIDDEN');
 else update public.creator_jobs set state=s,result=r,message=m,revision=revision+1,updated_at=now() where id=j.id returning * into j;
 end if;
 return jsonb_build_object('ok',true,'data',jsonb_build_object('job',to_jsonb(j)));
end; $$;

create function public.kettle_reserve_creator_attempt(p_account_id uuid,p_input jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.creator_jobs%rowtype; a public.creator_attempts%rowtype; b public.creator_pipeline_budget%rowtype;
 k text:=p_input->>'key'; provider text:=p_input->>'provider'; op text:=p_input->>'operation'; ceiling bigint:=(p_input->>'ceiling_microusd')::bigint; receipt jsonb;
begin
 perform 1 from public.accounts where id=p_account_id and state='active' for update;
 if not found then return public.kettle_error('FORBIDDEN'); end if;
 select * into j from public.creator_jobs where id=(p_input->>'job_id')::uuid and account_id=p_account_id for update;
 if not found then return public.kettle_error('NOT_FOUND'); end if;
 if k is null or length(k) not between 1 and 200 or ceiling is null or ceiling<0 or provider is null or op is null or not
  ((provider='scrapecreators' and op in ('profile','feed','video')) or (provider='lightreel' and op in ('research','poll')) or (provider='openai' and op='generate')) then return public.kettle_error('VALIDATION_ERROR'); end if;
 select * into a from public.creator_attempts where job_id=j.id and key=k;
 if found then
  if a.provider<>provider or a.operation<>op or a.ceiling_microusd<>ceiling then return public.kettle_error('IDEMPOTENCY_CONFLICT'); end if;
  select ar.receipt into receipt from public.creator_attempt_receipts ar where ar.job_id=j.id and ar.key=k;
  if found then return jsonb_build_object('ok',true,'data',jsonb_build_object('status','replay','receipt',receipt)); end if;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('status','ambiguous'));
 end if;
 if j.state<>'running' then return public.kettle_error('FORBIDDEN'); end if;
 perform 1 from public.creator_pipeline_allowances where account_id=p_account_id and profile_url=public.kettle_creator_profile_url(j.captured) and enabled and expires_at>now() for share;
 if not found then return public.kettle_error('FORBIDDEN'); end if;
 if (select count(*) from public.creator_attempts where job_id=j.id)>=32 then return public.kettle_error('FORBIDDEN'); end if;
 if ceiling=0 then
  -- Each configured metadata/research/history request consumes one explicit trial unit.
  -- OpenAI is deliberately excluded; a zero-dollar reservation is not evidence of free access.
  if provider not in ('scrapecreators','lightreel') then return public.kettle_error('FORBIDDEN'); end if;
  update public.creator_provider_trials t set remaining_units=t.remaining_units-1
   where t.provider=p_input->>'provider' and t.enabled and t.expires_at>now() and t.remaining_units>=1;
  if not found then return public.kettle_error('FORBIDDEN'); end if;
 else
  select * into b from public.creator_pipeline_budget where id=1 for update;
  if not found or ceiling>b.limit_microusd-b.reserved_microusd then return public.kettle_error('FORBIDDEN'); end if;
  update public.creator_pipeline_budget set reserved_microusd=reserved_microusd+ceiling where id=1;
 end if;
 insert into public.creator_attempts(job_id,key,provider,operation,ceiling_microusd) values(j.id,k,provider,op,ceiling);
 return jsonb_build_object('ok',true,'data',jsonb_build_object('status','acquired'));
end; $$;
create function public.kettle_complete_creator_attempt(p_account_id uuid,p_input jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.creator_jobs%rowtype; existing jsonb; r jsonb:=p_input->'receipt'; k text:=p_input->>'key';
begin
 perform 1 from public.accounts where id=p_account_id and state='active' for update;
 if not found then return public.kettle_error('FORBIDDEN'); end if;
 select * into j from public.creator_jobs where id=(p_input->>'job_id')::uuid and account_id=p_account_id for update;
 if not found then return public.kettle_error('NOT_FOUND'); end if;
 if r is null or r='null'::jsonb or octet_length(r::text)>307200 then return public.kettle_error('VALIDATION_ERROR'); end if;
 perform 1 from public.creator_attempts where job_id=j.id and key=k;
 if not found then return public.kettle_error('NOT_FOUND'); end if;
 select receipt into existing from public.creator_attempt_receipts where job_id=j.id and key=k;
 if found then
  if existing<>r then return public.kettle_error('IDEMPOTENCY_CONFLICT'); end if;
 else
  -- Persist the already reserved call even if its allowance expired during I/O.
  if j.state<>'running' then return public.kettle_error('FORBIDDEN'); end if;
  insert into public.creator_attempt_receipts(job_id,key,receipt) values(j.id,k,r);
 end if;
 return jsonb_build_object('ok',true,'data',jsonb_build_object('status','completed','receipt',r));
end; $$;
create function public.kettle_list_creator_dispatches(p_account_id uuid,p_input jsonb) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('ok',true,'data',jsonb_build_object('jobs',coalesce(jsonb_agg(jsonb_build_object('id',j.id,'account_id',j.account_id,'state',j.state)),'[]'::jsonb)))
 from (select j.id,j.account_id,j.state from public.creator_jobs j join public.accounts a on a.id=j.account_id and a.state='active'
 join public.creator_pipeline_allowances al on al.account_id=j.account_id and al.profile_url=public.kettle_creator_profile_url(j.captured) and al.enabled and al.expires_at>now()
 where j.state in ('queued','running') order by j.created_at,j.id limit greatest(0,least(10,coalesce((p_input->>'limit')::integer,10)))) j;
$$;
-- Helpers are also service-only: security invoker never elevates an untrusted caller.
revoke all on function public.kettle_creator_job_history(),public.kettle_creator_profile_url(jsonb),public.kettle_get_creator_job(uuid,jsonb),public.kettle_start_creator_job(uuid,jsonb,text),public.kettle_start_creator_scan(uuid,jsonb),public.kettle_start_creator_recommendations(uuid,jsonb),public.kettle_start_creator_scripts(uuid,jsonb),public.kettle_save_creator_scripts(uuid,jsonb),public.kettle_run_creator_job(uuid,jsonb),public.kettle_finish_creator_job(uuid,jsonb),public.kettle_reserve_creator_attempt(uuid,jsonb),public.kettle_complete_creator_attempt(uuid,jsonb),public.kettle_list_creator_dispatches(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.kettle_creator_job_history(),public.kettle_creator_profile_url(jsonb),public.kettle_get_creator_job(uuid,jsonb),public.kettle_start_creator_job(uuid,jsonb,text),public.kettle_start_creator_scan(uuid,jsonb),public.kettle_start_creator_recommendations(uuid,jsonb),public.kettle_start_creator_scripts(uuid,jsonb),public.kettle_save_creator_scripts(uuid,jsonb),public.kettle_run_creator_job(uuid,jsonb),public.kettle_finish_creator_job(uuid,jsonb),public.kettle_reserve_creator_attempt(uuid,jsonb),public.kettle_complete_creator_attempt(uuid,jsonb),public.kettle_list_creator_dispatches(uuid,jsonb) to service_role;
