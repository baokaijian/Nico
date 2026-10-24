// Isolated PostgreSQL WASM rehearsal. No URL, credentials or production connection.
// Install @electric-sql/pglite@0.5.11 outside the project, then pass its dist/index.js.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { COLLECTIONS } from '../shared/domain.mjs';
const modulePath=process.argv[2];
if(!modulePath||!path.isAbsolute(modulePath))throw Error('请提供隔离 PGlite 模块的绝对路径，不接受数据库URL');
const {PGlite}=await import(pathToFileURL(modulePath).href),db=new PGlite();
const root=path.resolve(import.meta.dirname,'..');
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(fs.readFileSync(path.join(root,'backend/nico-schema.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'backend/nico-soft-delete.sql'),'utf8'));
  await db.query('insert into public.nico_state(id,data,revision) values(1,$1::jsonb,7)',[JSON.stringify({swim:[{id:'legacy-protocol',timeMs:60000}],trash:[]})]);
  const before=await db.query('select * from public.nico_state');
  await db.query("insert into public.nico_accounts(username,salt,password_hash) values('protocol-parent','protocol-salt','protocol-hash')");
  await db.query('insert into public.nico_sessions(token_hash,username,expires_at) values($1,$2,$3)',['a'.repeat(64),'protocol-parent','2100-01-01T00:00:00Z']);
  const files=fs.readdirSync(path.join(root,'supabase/migrations')).filter(name=>name.endsWith('.sql')).sort();
  for(const name of files)await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',name),'utf8'));
  assert.deepEqual((await db.query('select * from public.nico_state')).rows,before.rows,'迁移不能重写状态或版本');
  if(COLLECTIONS.includes('childViews')){
    assert.equal((await db.query('select scope from public.nico_sessions')).rows[0].scope,'parent','旧会话保持家长权限');
    await db.query('insert into public.nico_sessions(token_hash,username,expires_at,scope,parent_token_hash,context) values($1,$2,$3,$4,$5,$6)', ['b'.repeat(64),'protocol-parent','2100-01-01T00:00:00Z','child','a'.repeat(64),JSON.stringify({viewId:'protocol-view',viewVersion:1})]);
    await assert.rejects(db.query('insert into public.nico_sessions(token_hash,username,expires_at,scope,parent_token_hash,context) values($1,$2,$3,$4,$5,$6)', ['c'.repeat(64),'protocol-parent','2100-01-01T00:00:00Z','child','a'.repeat(64),JSON.stringify({viewId:null,viewVersion:1})]));
  }
  const snapshot=Object.fromEntries(COLLECTIONS.map(key=>[key,[{id:`protocol-${key}`,notes:'isolated protocol only'}]]));snapshot.trash=[];
  await db.query('select public.nico_sync_records($1::jsonb,8,$2)',[JSON.stringify(snapshot),'protocol-parent']);
  const ledger=await db.query('select collection,record_id,is_deleted from public.nico_records');
  assert.equal(ledger.rows.filter(row=>!row.is_deleted).length,COLLECTIONS.length);assert.ok(ledger.rows.find(row=>row.record_id==='legacy-protocol').is_deleted);
  const original=structuredClone(snapshot);snapshot.growthStories=[];snapshot.trash=[{collection:'growthStories',record:original.growthStories[0],deletedAt:'2000-01-01T00:00:00Z',deletedBy:'protocol-parent'}];
  await db.query('select public.nico_sync_records($1::jsonb,9,$2)',[JSON.stringify(snapshot),'protocol-parent']);
  assert.equal((await db.query("select is_deleted from public.nico_records where collection='growthStories'")).rows[0].is_deleted,true);
  await db.query('select public.nico_sync_records($1::jsonb,10,$2)',[JSON.stringify(original),'protocol-parent']);
  assert.equal((await db.query("select is_deleted from public.nico_records where collection='growthStories'")).rows[0].is_deleted,false);
  const perms=await db.query("select has_table_privilege('anon','public.nico_records','SELECT') as read, has_function_privilege('anon','public.nico_sync_records(jsonb,bigint,text)','EXECUTE') as write, (select relrowsecurity from pg_class where oid='public.nico_records'::regclass) as rls");
  assert.deepEqual(perms.rows[0],{read:false,write:false,rls:true});
  console.log(JSON.stringify({isolated:true,postgres:await db.query('select version()'),migrations:files.length,collections:COLLECTIONS.length,legacyPreserved:true,stateUnchanged:true,deleteRestore:true,anonDenied:true}));
}finally{await db.close();}
