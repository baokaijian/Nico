-- Nico uses isolated tables. No privileges or records of other applications change.
create table public.nico_state (id integer primary key check(id=1), data jsonb not null, revision bigint not null check(revision>0));
create table public.nico_backups (revision bigint primary key, data jsonb not null, saved_at timestamptz not null default now(), actor text not null);
create table public.nico_accounts (username text primary key, salt text not null, password_hash text not null, must_change_password boolean not null default true, enabled boolean not null default true);
create table public.nico_sessions (token_hash text primary key, username text not null references public.nico_accounts(username) on delete cascade, expires_at timestamptz not null);
create index nico_sessions_expiry on public.nico_sessions(expires_at);
create table public.nico_login_limits (key text primary key, attempts integer not null, expires_at timestamptz not null);
alter table public.nico_state enable row level security;
alter table public.nico_backups enable row level security;
alter table public.nico_accounts enable row level security;
alter table public.nico_sessions enable row level security;
alter table public.nico_login_limits enable row level security;
revoke all on public.nico_state, public.nico_backups, public.nico_accounts, public.nico_sessions, public.nico_login_limits from public, anon, authenticated;
grant all on public.nico_state, public.nico_backups, public.nico_accounts, public.nico_sessions, public.nico_login_limits to service_role;

create function public.nico_save_state(p_expected bigint, p_data jsonb, p_actor text) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare current_revision bigint; current_data jsonb;
begin
  select revision,data into current_revision,current_data from public.nico_state where id=1 for update;
  if current_revision is null then raise exception 'NICO_MISSING'; end if;
  if current_revision <> p_expected then raise exception 'NICO_CONFLICT'; end if;
  insert into public.nico_backups(revision,data,actor) values(current_revision,current_data,p_actor);
  update public.nico_state set data=p_data, revision=current_revision+1 where id=1;
  return current_revision+1;
end; $$;

create function public.nico_login_attempt(p_key text) returns integer
language plpgsql security invoker set search_path = '' as $$
declare result integer;
begin
  delete from public.nico_login_limits where expires_at < now();
  insert into public.nico_login_limits(key,attempts,expires_at) values(p_key,1,now()+interval '15 minutes')
    on conflict(key) do update set attempts=public.nico_login_limits.attempts+1 returning attempts into result;
  return result;
end; $$;

create function public.nico_change_password(p_username text, p_previous text, p_salt text, p_hash text) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  update public.nico_accounts set salt=p_salt,password_hash=p_hash,must_change_password=false
    where username=p_username and password_hash=p_previous;
  if not found then return false; end if;
  delete from public.nico_sessions where username=p_username;
  return true;
end; $$;
revoke all on function public.nico_save_state(bigint,jsonb,text), public.nico_login_attempt(text), public.nico_change_password(text,text,text,text) from public,anon,authenticated;
grant execute on function public.nico_save_state(bigint,jsonb,text), public.nico_login_attempt(text), public.nico_change_password(text,text,text,text) to service_role;
