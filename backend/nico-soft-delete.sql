-- Apply after nico-schema.sql. Existing Nico facts and revisions are preserved.
alter table public.nico_state add column is_deleted boolean not null default false,
  add column deleted_at timestamptz, add column deleted_by text;
alter table public.nico_backups add column is_deleted boolean not null default false,
  add column deleted_at timestamptz, add column deleted_by text;
alter table public.nico_accounts add column is_deleted boolean not null default false,
  add column deleted_at timestamptz, add column deleted_by text;

-- Per-record ledger; the JSON snapshot remains compatible with the application.
create table public.nico_records (
  collection text not null check(collection in ('growth','swim','trainings','fitness','nutrition','goals','plans','annotations','media')),
  record_id text not null check(length(record_id)>0), payload jsonb not null,
  revision bigint not null, is_deleted boolean not null default false,
  deleted_at timestamptz, deleted_by text,
  primary key(collection,record_id),
  check ((is_deleted and deleted_at is not null and deleted_by is not null)
    or (not is_deleted and deleted_at is null and deleted_by is null))
);
create index nico_records_deleted on public.nico_records(is_deleted,collection);
alter table public.nico_records enable row level security;
revoke all on public.nico_records from public,anon,authenticated,service_role;
revoke delete,truncate on public.nico_state,public.nico_backups,public.nico_accounts from service_role;
grant select,insert,update on public.nico_records to service_role;

create function public.nico_sync_records(p_data jsonb,p_revision bigint,p_actor text) returns void
language plpgsql security invoker set search_path='' as $$
declare item jsonb; entry record;
begin
  -- Omitted records are retained, including omissions caused by backup restore.
  update public.nico_records r set is_deleted=true,deleted_at=now(),deleted_by=p_actor,revision=p_revision
    where not r.is_deleted and not exists (
      select 1 from jsonb_array_elements(coalesce(p_data->r.collection,'[]'::jsonb)) x
      where x->>'id'=r.record_id);
  for item in select value from jsonb_array_elements(coalesce(p_data->'trash','[]'::jsonb)) loop
    insert into public.nico_records(collection,record_id,payload,revision,is_deleted,deleted_at,deleted_by)
      values(item->>'collection',item->'record'->>'id',item->'record',p_revision,true,
        coalesce(nullif(item->>'deletedAt','')::timestamptz,now()),coalesce(nullif(item->>'deletedBy',''),p_actor))
      on conflict(collection,record_id) do update set
        payload=excluded.payload,revision=excluded.revision,is_deleted=true,
        deleted_at=coalesce(public.nico_records.deleted_at,excluded.deleted_at),
        deleted_by=coalesce(public.nico_records.deleted_by,excluded.deleted_by);
  end loop;
  for entry in select key,value from jsonb_each(p_data)
    where key in ('growth','swim','trainings','fitness','nutrition','goals','plans','annotations','media') loop
    for item in select value from jsonb_array_elements(entry.value) loop
      insert into public.nico_records(collection,record_id,payload,revision)
        values(entry.key,item->>'id',item,p_revision)
        on conflict(collection,record_id) do update set payload=excluded.payload,revision=excluded.revision,
          is_deleted=false,deleted_at=null,deleted_by=null;
    end loop;
  end loop;
end; $$;

create function public.nico_sync_state_records() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  perform public.nico_sync_records(new.data,new.revision,coalesce(nullif(current_setting('nico.actor',true),''),current_user));
  return new;
end; $$;
create trigger nico_state_records after insert or update of data on public.nico_state
  for each row execute function public.nico_sync_state_records();

create or replace function public.nico_save_state(p_expected bigint,p_data jsonb,p_actor text) returns bigint
language plpgsql security invoker set search_path='' as $$
declare current_revision bigint; current_data jsonb;
begin
  select revision,data into current_revision,current_data from public.nico_state where id=1 and not is_deleted for update;
  if current_revision is null then raise exception 'NICO_MISSING'; end if;
  if current_revision<>p_expected then raise exception 'NICO_CONFLICT'; end if;
  perform set_config('nico.actor',p_actor,true);
  insert into public.nico_backups(revision,data,actor) values(current_revision,current_data,p_actor);
  update public.nico_state set data=p_data,revision=current_revision+1 where id=1;
  return current_revision+1;
end; $$;

-- Also protect privileged accidental SQL DELETE/TRUNCATE. No physical deletion
-- endpoint or cascading deletion is available for business records or backups.
create function public.nico_block_physical_delete() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception 'NICO_SOFT_DELETE_REQUIRED: use is_deleted and retain original data'; end; $$;
do $$ declare relation text; begin
  foreach relation in array array['nico_state','nico_backups','nico_accounts','nico_records'] loop
    execute format('create trigger nico_no_delete before delete on public.%I for each row execute function public.nico_block_physical_delete()',relation);
    execute format('create trigger nico_no_truncate before truncate on public.%I for each statement execute function public.nico_block_physical_delete()',relation);
  end loop;
end; $$;

create or replace function public.nico_change_password(p_username text,p_previous text,p_salt text,p_hash text) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
  update public.nico_accounts set salt=p_salt,password_hash=p_hash,must_change_password=false
    where username=p_username and password_hash=p_previous and enabled and not is_deleted;
  if not found then return false; end if;
  delete from public.nico_sessions where username=p_username;
  return true;
end; $$;
revoke all on function public.nico_sync_records(jsonb,bigint,text),public.nico_sync_state_records(),public.nico_block_physical_delete() from public,anon,authenticated;
grant execute on function public.nico_sync_records(jsonb,bigint,text),public.nico_sync_state_records(),public.nico_block_physical_delete() to service_role;
-- Backfill existing facts once, without editing the snapshot or its revision.
select public.nico_sync_records(data,revision,'schema-backfill') from public.nico_state where id=1;
