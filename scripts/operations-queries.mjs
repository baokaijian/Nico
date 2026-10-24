// Pass log queries to Supabase query_logs with an explicit <=24h UTC window.
// Outputs contain only fixed groups, counts and durations. Never SELECT * from logs.
import {pathToFileURL} from 'node:url';
export const logs=`select toStartOfHour(timestamp) as hour,
 multiIf(endsWith(log_attributes['request.pathname'],'/api/auth/login'),'login',
 endsWith(log_attributes['request.pathname'],'/api/media') and log_attributes['request.method']='POST','upload',
 match(log_attributes['request.pathname'],'/api/media/[^/]+/variants$'),'processing',
 match(log_attributes['request.pathname'],'/api/media/[^/]+/processing-failure$'),'processingFailure',
 endsWith(log_attributes['request.pathname'],'/api/version') or endsWith(log_attributes['request.pathname'],'/api/health'),'health',
 position(log_attributes['request.pathname'],'/api/public-')>0,'publicRead','archive') as category,
 log_attributes['response.status_code'] as status,count() as requests, countIf(notEmpty(log_attributes['execution_time_ms'])) as timed_requests,
 quantileIf(0.5)(toFloat64OrZero(log_attributes['execution_time_ms']),notEmpty(log_attributes['execution_time_ms'])) as p50_ms,
 quantileIf(0.95)(toFloat64OrZero(log_attributes['execution_time_ms']),notEmpty(log_attributes['execution_time_ms'])) as p95_ms
 from logs where source='function_edge_logs'
 and position(log_attributes['request.pathname'],'/nico-api/api/')>0 and log_attributes['request.method']!='OPTIONS'
 group by hour,category,status order by hour,category,status`;
export const database=`select jsonb_build_object(
 'revision',(select revision from public.nico_state where id=1),
 'checksum',(select md5(data::text) from public.nico_state where id=1),
 'ledger',(select count(*) from public.nico_records),
 'backups',(select jsonb_build_object('count',count(*),'latest',max(saved_at),'latestRevision',max(revision)) from public.nico_backups where not is_deleted),
 'storage',(select jsonb_build_object('objects',count(*),'bytes',coalesce(sum((metadata->>'size')::bigint),0)) from storage.objects where bucket_id='nico-private'),
 'nicoTables',(select jsonb_agg(jsonb_build_object('table',c.relname,'rls',c.relrowsecurity,'anon',has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE'),'authenticated',has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE'))) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname like 'nico_%')) as health`;
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(process.argv.includes('--database')?database:logs);
