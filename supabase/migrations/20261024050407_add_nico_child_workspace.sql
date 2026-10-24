-- Compatible private child workspace. Existing sessions remain parent sessions.
alter table public.nico_sessions add column scope text not null default 'parent';
alter table public.nico_sessions add column parent_token_hash text;
alter table public.nico_sessions add column context jsonb not null default '{}'::jsonb;
alter table public.nico_sessions add constraint nico_session_scope check(scope in ('parent','child'));
alter table public.nico_sessions add constraint nico_child_context check(
 (scope='parent' and parent_token_hash is null and context='{}'::jsonb) or
 (scope='child' and parent_token_hash is not null and parent_token_hash ~ '^[a-f0-9]{64}$'
  and jsonb_typeof(context)='object' and (context - array['viewId','viewVersion'])='{}'::jsonb
  and context ? 'viewId' and context ? 'viewVersion' and jsonb_typeof(context->'viewId')='string'
  and (context->>'viewId') ~ '^[A-Za-z0-9_-]{1,100}$'
  and jsonb_typeof(context->'viewVersion')='number' and (context->>'viewVersion') ~ '^[1-9][0-9]*$'));

-- Additive V1.5 private child workspace; retained on application rollback.
-- No business snapshot, revision, media object, history or existing row is rewritten.
-- Keep the wider constraint on application rollback once either new collection has data.
alter table public.nico_records drop constraint nico_records_collection_check;
alter table public.nico_records add constraint nico_records_collection_check
  check(collection in ('growth','swim','trainings','fitness','nutrition','goals','plans','annotations','media','weakpoints','checkins','trainingTemplates','skillDefinitions','skillAssessments','milestones','growthStories','reportDrafts','competitionEvents','videoComparisons','childViews','childReflections'));

create or replace function public.nico_sync_records(p_data jsonb,p_revision bigint,p_actor text) returns void
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
    where key in ('growth','swim','trainings','fitness','nutrition','goals','plans','annotations','media','weakpoints','checkins','trainingTemplates','skillDefinitions','skillAssessments','milestones','growthStories','reportDrafts','competitionEvents','videoComparisons','childViews','childReflections') loop
    for item in select value from jsonb_array_elements(entry.value) loop
      insert into public.nico_records(collection,record_id,payload,revision)
        values(entry.key,item->>'id',item,p_revision)
        on conflict(collection,record_id) do update set payload=excluded.payload,revision=excluded.revision,
          is_deleted=false,deleted_at=null,deleted_by=null;
    end loop;
  end loop;
end; $$;

-- Replacement preserves existing privileges; repeat the intended boundary explicitly.
revoke all on function public.nico_sync_records(jsonb,bigint,text) from public,anon,authenticated;
grant execute on function public.nico_sync_records(jsonb,bigint,text) to service_role;
