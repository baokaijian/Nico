import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { emptyState } from '../shared/domain.mjs';
import { createApp } from '../server/server.js';
import { createCloudHandler } from '../server/cloud-api.mjs';
import { openStore } from '../server/store.mjs';
export async function archiveHarness(t, runtime, seed=emptyState()) {
  const token='e'.repeat(64); let read, send;
  if(runtime==='local') {
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nico-archive-protocol-'));fs.writeFileSync(path.join(dir,'seed.json'),JSON.stringify(seed));
    const store=openStore({filename:path.join(dir,'state.sqlite'),seedPath:path.join(dir,'seed.json'),backupDir:path.join(dir,'backups')});
    const server=createApp({store,uploadsDir:path.join(dir,'uploads'),tokens:{owner:token,coach:'c'.repeat(64),viewer:'d'.repeat(64)},processUploads:false}).listen(0,'127.0.0.1');await once(server,'listening');
    t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();fs.rmSync(dir,{recursive:true,force:true});});
    read=()=>store.read();send=(route,method='GET',body,revision=read().revision,role='owner')=>fetch(`http://127.0.0.1:${server.address().port}${route}`,{method,headers:{...(role==='guest'?{}:{Authorization:`Bearer ${role==='coach'?'c'.repeat(64):token}`}), ...(body instanceof FormData?{}:{'Content-Type':'application/json'}),'If-Match':String(revision)},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})});
  } else {
    const files=new Map();let current={data:seed,revision:1}; const handler=createCloudHandler({origins:[],backend:{upload:async(name,bytes,type)=>files.set(name,{bytes,type}),removeFile:async name=>files.delete(name),download:async name=>files.has(name)?new Response(files.get(name).bytes,{headers:{'Content-Type':files.get(name).type}}):new Response(null,{status:404}),read:async()=>structuredClone(current),session:async()=>({username:'protocol-parent',expires_at:'2100-01-01T00:00:00Z'}),account:async()=>({must_change_password:false}),save:async(revision,data)=>{if(revision!==current.revision)throw Object.assign(Error('conflict'),{status:409});current={data:structuredClone(data),revision:revision+1};return current.revision;}}});
    read=()=>structuredClone(current);send=(route,method='GET',body,revision=read().revision,role='owner')=>handler(new Request(`https://protocol.invalid/nico-api${route}`,{method,headers:{...(role==='guest'?{}:{Authorization:`Bearer ${token}`}), ...(body instanceof FormData?{}:{'Content-Type':'application/json'}),'If-Match':String(revision)},...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})}));
  }
  const create=async(key,input,requestId=crypto.randomUUID())=>{const res=await send(`/api/${key}`,'POST',{...input,clientRequestId:requestId});return {res,value:await res.json()};};
  return {read,send,create};
}
