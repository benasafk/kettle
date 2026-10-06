-- Integration lead: append-only migration; identity is supplied ONLY by a verified server token.
create table public.account_identities (
  issuer text not null check (length(issuer) between 1 and 2048),
  subject text not null check (length(subject) between 1 and 255),
  account_id uuid not null references public.accounts(id),
  blocked boolean not null default false,
  tokens_valid_after timestamptz not null default '-infinity',
  created_at timestamptz not null default now(),
  primary key (issuer, subject)
);
create index account_identities_account on public.account_identities(account_id);
alter table public.account_identities enable row level security;
revoke all on public.account_identities from public, anon, authenticated, service_role;
grant select, insert, update on public.account_identities to service_role;

create function public.kettle_resolve_identity(p_issuer text, p_subject text, p_issued_at numeric)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_identity public.account_identities%rowtype;
  v_account uuid;
begin
  if p_issuer is null or length(p_issuer) not between 1 and 2048
    or p_subject is null or length(p_subject) not between 1 and 255
    or p_issued_at is null or p_issued_at <= 0
    or p_issued_at > extract(epoch from now()) + 60 then
    return null;
  end if;
  -- Transaction-scoped lock serializes concurrent first login for exactly this
  -- identity. Hash collisions can only serialize unrelated requests, never link them.
  perform pg_advisory_xact_lock(hashtextextended(jsonb_build_array(p_issuer, p_subject)::text, 0));
  select * into v_identity from public.account_identities
    where issuer = p_issuer and subject = p_subject for update;
  if found then
    if v_identity.blocked or to_timestamp(p_issued_at::double precision) <= v_identity.tokens_valid_after then
      return null;
    end if;
    return v_identity.account_id;
  end if;
  insert into public.accounts(display_name) values ('Kettle member') returning id into v_account;
  insert into public.account_identities(issuer, subject, account_id) values (p_issuer, p_subject, v_account);
  return v_account;
end;
$$;
revoke all on function public.kettle_resolve_identity(text, text, numeric) from public, anon, authenticated;
grant execute on function public.kettle_resolve_identity(text, text, numeric) to service_role;
