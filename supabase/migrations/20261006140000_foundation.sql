-- Owner: integration lead. Append migrations; never edit an applied migration.
-- Identity-provider mapping is intentionally deferred. No auth.users coupling.
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  state text not null default 'active' check (state in ('active', 'suspended')),
  preferred_language text not null default 'en' check (length(preferred_language) between 1 and 35),
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id),
  name text not null check (length(btrim(name)) between 1 and 120),
  project_type text not null check (project_type = 'brand'),
  current_version integer not null check (current_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, account_id)
);
create index projects_owner on public.projects(account_id, updated_at desc);

create table public.brief_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  account_id uuid not null,
  version integer not null check (version > 0),
  name text not null check (length(btrim(name)) between 1 and 120),
  brief jsonb not null check (jsonb_typeof(brief) = 'object'),
  created_at timestamptz not null default now(),
  unique (project_id, account_id, version),
  foreign key (project_id, account_id) references public.projects(id, account_id)
);
alter table public.projects add constraint projects_current_brief
  foreign key (id, account_id, current_version)
  references public.brief_versions(project_id, account_id, version)
  deferrable initially deferred;

-- Successful responses are immutable snapshots: retrying after a later edit returns
-- the original response. Retention/cleanup must be defined before a real-user pilot.
create table public.write_receipts (
  account_id uuid not null references public.accounts(id),
  request_id uuid not null,
  operation text not null check (operation = 'save_project'),
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now(),
  primary key (account_id, request_id)
);

alter table public.accounts enable row level security;
alter table public.projects enable row level security;
alter table public.brief_versions enable row level security;
alter table public.write_receipts enable row level security;
-- Default deny to client roles. Stage 2 selects an identity mapping before adding
-- any client RLS policies. Only the trusted server uses the service role.
revoke all on public.accounts, public.projects, public.brief_versions, public.write_receipts from public, anon, authenticated, service_role;
grant select, insert, update on public.accounts, public.projects to service_role;
grant select, insert on public.brief_versions, public.write_receipts to service_role;

create function public.kettle_error(p_code text) returns jsonb
language sql immutable security invoker set search_path = '' as $$
  select jsonb_build_object('ok', false, 'error', jsonb_build_object(
    'code', p_code, 'retryable', false,
    'message', case p_code
      when 'NOT_FOUND' then 'This project is unavailable.'
      when 'FORBIDDEN' then 'This action is not permitted for this account.'
      when 'VERSION_CONFLICT' then 'The project has changed. Reload before saving a new request.'
      when 'IDEMPOTENCY_CONFLICT' then 'This request ID was already used for different content. Use a new request ID.'
      else 'Check the required fields and their allowed values.' end,
    'recovery', case p_code
      when 'NOT_FOUND' then 'reload' when 'VERSION_CONFLICT' then 'reload'
      when 'FORBIDDEN' then 'contact_support' else 'correct_input' end
  ));
$$;

create function public.kettle_get_account_state(p_account_id uuid, p_input jsonb) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce((select jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'account', to_jsonb(a),
    'entitlements', jsonb_build_object('status', 'not_configured'),
    'usage', jsonb_build_object('status', 'not_configured', 'reset_at', null)
  )) from public.accounts a where a.id = p_account_id), public.kettle_error('FORBIDDEN'));
$$;

create function public.kettle_get_project(p_account_id uuid, p_input jsonb) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select case when not exists (select 1 from public.accounts where id = p_account_id and state = 'active')
    then public.kettle_error('FORBIDDEN')
    else coalesce((select jsonb_build_object('ok', true, 'data', jsonb_build_object(
      'project', (to_jsonb(p) - 'account_id') || jsonb_build_object('brief_version', to_jsonb(b) - 'account_id')
    )) from public.projects p join public.brief_versions b
      on (b.project_id, b.account_id, b.version) = (p.id, p.account_id, p.current_version)
      where p.id = (p_input->>'project_id')::uuid and p.account_id = p_account_id), public.kettle_error('NOT_FOUND')) end;
$$;

create function public.kettle_save_project(p_account_id uuid, p_input jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_request_id uuid := (p_input->>'request_id')::uuid;
  v_project_id uuid := (p_input->>'project_id')::uuid;
  v_expected integer := (p_input->>'expected_version')::integer;
  v_current integer;
  v_version integer;
  v_receipt public.write_receipts%rowtype;
  v_output jsonb;
begin
  -- Serialize writes per account. The lock protects duplicate first submissions,
  -- updates, and receipt insertion in one transaction; no select-then-insert race.
  perform 1 from public.accounts where id = p_account_id and state = 'active' for update;
  if not found then return public.kettle_error('FORBIDDEN'); end if;

  select * into v_receipt from public.write_receipts
    where account_id = p_account_id and request_id = v_request_id;
  if found then
    if v_receipt.input = p_input then return v_receipt.output; end if;
    return public.kettle_error('IDEMPOTENCY_CONFLICT');
  end if;

  if v_request_id is null or v_expected is null or v_expected < 0
    or p_input->>'project_type' is distinct from 'brand'
    or p_input->'brief' is null or jsonb_typeof(p_input->'brief') <> 'object'
    or p_input->>'name' is null or length(btrim(p_input->>'name')) not between 1 and 120 then
    return public.kettle_error('VALIDATION_ERROR');
  end if;

  if v_project_id is null then
    if v_expected <> 0 then return public.kettle_error('VALIDATION_ERROR'); end if;
    v_project_id := gen_random_uuid();
    v_version := 1;
    insert into public.projects(id, account_id, name, project_type, current_version)
      values (v_project_id, p_account_id, p_input->>'name', 'brand', v_version);
  else
    select current_version into v_current from public.projects
      where id = v_project_id and account_id = p_account_id for update;
    if not found then return public.kettle_error('NOT_FOUND'); end if;
    if v_expected <> v_current then return public.kettle_error('VERSION_CONFLICT'); end if;
    v_version := v_current + 1;
    update public.projects set name = p_input->>'name', current_version = v_version, updated_at = now()
      where id = v_project_id and account_id = p_account_id;
  end if;

  insert into public.brief_versions(project_id, account_id, version, name, brief)
    values (v_project_id, p_account_id, v_version, p_input->>'name', p_input->'brief');
  v_output := public.kettle_get_project(p_account_id, jsonb_build_object('project_id', v_project_id));
  v_output := jsonb_set(v_output, '{data,request_id}', to_jsonb(v_request_id));
  insert into public.write_receipts(account_id, request_id, operation, input, output)
    values (p_account_id, v_request_id, 'save_project', p_input, v_output);
  return v_output;
end;
$$;

revoke all on function public.kettle_error(text) from public, anon, authenticated;
revoke all on function public.kettle_get_account_state(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.kettle_get_project(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.kettle_save_project(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.kettle_error(text) to service_role;
grant execute on function public.kettle_get_account_state(uuid, jsonb) to service_role;
grant execute on function public.kettle_get_project(uuid, jsonb) to service_role;
grant execute on function public.kettle_save_project(uuid, jsonb) to service_role;
