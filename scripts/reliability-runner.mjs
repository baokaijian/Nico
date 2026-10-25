// Private, explicitly configured immutable-export job. No production database client or scheduler.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {runSeal,runVerify,runRehearsal} from './backup-job.mjs';
import {digestBytes,generateBackupKeyPair} from '../shared/backup-crypto.mjs';
import {normalizeState,COLLECTIONS,emptyState} from '../shared/domain.mjs';
import {sanitizeOperationsEvent,sendOperationsAlert} from '../shared/operations-alerts.mjs';
const root=path.resolve(import.meta.dirname,'..'),MiB=1024*1024;
const within=(file,parent)=>file===parent||file.startsWith(parent+path.sep);
const fail=category=>{throw Object.assign(Error(category),{category});};
const safeCategory=error=>new Set(['configuration','capacity','format','missing-media','source-changed','crypto','integrity','storage']).has(error?.category)?error.category:'internal';
function canonical(input,{directory=true}={}){
 if(typeof input!=='string'||!path.isAbsolute(input)||path.normalize(input)!==input)fail('configuration');
 let current=path.parse(input).root;
 for(const part of input.slice(current.length).split(path.sep).filter(Boolean)){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())fail('configuration');}
 const stat=fs.statSync(input);if(directory?!stat.isDirectory():!stat.isFile())fail('configuration');
 return fs.realpathSync(input);
}
function settings(config){
 if(config.schema!==1||config.enabled!==true||Object.keys(config).some(k=>!['schema','enabled','sourceDir','workDir','targetDir','allowedTargetRoot','recipientPublicKeyFile','verificationPrivateKeyFile','maxTotalBytes'].includes(k)))fail('configuration');
 let source,work,target,allowed,publicKey,privateKey;
 try{source=canonical(config.sourceDir);work=canonical(config.workDir);target=canonical(config.targetDir);allowed=canonical(config.allowedTargetRoot);publicKey=canonical(config.recipientPublicKeyFile,{directory:false});privateKey=canonical(config.verificationPrivateKeyFile,{directory:false});}catch{fail('configuration');}
 const dirs=[source,work,target];
 if(dirs.some(p=>within(p,root)||within(root,p))||!within(target,allowed)||allowed===path.parse(allowed).root)fail('configuration');
 if(dirs.some((p,i)=>dirs.some((q,j)=>i!==j&&(within(p,q)||within(q,p)))))fail('configuration');
 if([publicKey,privateKey].some(k=>dirs.some(d=>within(k,d)))||publicKey===privateKey||within(privateKey,root)||fs.statSync(privateKey).mode&0o077)fail('configuration');
 const maxTotalBytes=config.maxTotalBytes??256*MiB;if(!Number.isSafeInteger(maxTotalBytes)||maxTotalBytes<1||maxTotalBytes>256*MiB)fail('configuration');
 // Existing work/target must already be private; never silently change a shared mount's permissions.
 if([source,work,target].some(p=>fs.statSync(p).mode&0o077))fail('configuration');
 return {source,work,target,publicKey,privateKey,maxTotalBytes};
}
async function inventory(source,maxTotalBytes){
 const files=[];let totalBytes=0;
 const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.name.startsWith('.')||!/^[A-Za-z0-9_.-]+$/.test(entry.name)||entry.isSymbolicLink())fail('configuration');
  const file=path.join(dir,entry.name),stat=fs.lstatSync(file);
  if(stat.isDirectory())walk(file);
  else{if(!stat.isFile())fail('configuration');if(stat.size<1||stat.size>100*MiB||files.length>=500||(totalBytes+=stat.size)>maxTotalBytes)fail('capacity');files.push({name:path.relative(source,file).split(path.sep).join('/'),size:stat.size});}
 }};walk(source);
 if(!files.length)fail('format');
 for(const file of files)file.sha256=await digestBytes(fs.readFileSync(path.join(source,file.name)));
 return {files:files.sort((a,b)=>a.name.localeCompare(b.name)),totalBytes};
}
function snapshotInfo(source,files){
 let snapshot,state;try{snapshot=JSON.parse(fs.readFileSync(path.join(source,'snapshot.json'),'utf8'));if(snapshot.format!=='nico-backup-v1'||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<0||COLLECTIONS.some(k=>!Array.isArray(snapshot.data?.[k]))||!['profile','publishing','trash'].every(k=>Object.hasOwn(snapshot.data,k))||!Array.isArray(snapshot.data.trash))fail('format');state=normalizeState(snapshot.data);}catch{fail('format');}
 const retained=key=>[...state[key],...state.trash.filter(t=>t.collection===key).map(t=>t.record),...(state.growthHistory||[]).filter(h=>h.collection===key).map(h=>h.record)];
 const media=[...state.media,...state.trash.filter(t=>t.collection==='media').map(t=>t.record)];
 const reports=[...retained('reportDrafts')];
 for(const book of retained('yearbooks')){media.push(...book.mediaSnapshots);reports.push(book.reportSnapshot);}
 // Frozen report baselines retain old media variants even after current metadata changes.
 // Inspect the typed snapshots, never free-text notes or remote URLs.
 for(const report of reports){let baseline;try{baseline=JSON.parse(report.baseline);}catch{fail('format');}for(const item of baseline.sources)if(item.collection==='media')media.push(item.record);}
 const names=new Set(files.map(f=>f.name)),required=new Set();
 for(const row of media){if(!row?.url)fail('missing-media');for(const key of ['url','playbackUrl','posterUrl'])if(row[key]){
  const match=typeof row[key]==='string'&&row[key].match(/^\/uploads\/([A-Za-z0-9_-][A-Za-z0-9_.-]*)$/);if(!match)fail('missing-media');const name=`uploads/${match[1]}`;if(!names.has(name))fail('missing-media');required.add(name);
 }}
 return {revision:snapshot.revision,mediaFiles:required.size};
}
export async function runOperations(config=null,{notification={}}={}){
 const receipt={schema:1,runId:`ops-${crypto.randomUUID()}`,startedAt:new Date().toISOString(),endedAt:null,ok:false,category:null,sourceRevision:null,counts:null,targetDigest:null,phases:[],notification:{status:'not-configured',attempts:0}};
 if(!config||config.enabled===false){receipt.category='not-configured';receipt.endedAt=new Date().toISOString();return receipt;}
 let jobDir;
 const phase=async(name,fn)=>{const started=Date.now();try{const result=await fn();receipt.phases.push({name,status:'pass',elapsedMs:Date.now()-started});return result;}catch(error){receipt.phases.push({name,status:'fail',elapsedMs:Date.now()-started});throw error;}};
 try{
  const cfg=await phase('configuration',()=>settings(config));
  jobDir=path.join(cfg.work,receipt.runId);fs.mkdirSync(jobDir,{mode:0o700});
  const inv=await phase('inventory',()=>inventory(cfg.source,cfg.maxTotalBytes));
  const info=await phase('completeness',()=>snapshotInfo(cfg.source,inv.files));
  receipt.sourceRevision=info.revision;receipt.counts={files:inv.files.length,bytes:inv.totalBytes,mediaFiles:info.mediaFiles};
  const sealed=await phase('seal',async()=>{const result=await runSeal({inputDir:cfg.source,keyFile:cfg.publicKey,outDir:jobDir,info:{revision:info.revision,release:'1.9.0'}});if(!result.ok)fail('crypto');fs.chmodSync(path.join(jobDir,'package.json'),0o600);return path.join(jobDir,'package.json');});
  await phase('verify',async()=>{if(!(await runVerify({packageFile:sealed,keyFile:cfg.privateKey})).ok)fail('integrity');});
  await phase('source-stability',async()=>{try{if(JSON.stringify(await inventory(cfg.source,cfg.maxTotalBytes))!==JSON.stringify(inv))fail('source-changed');}catch{fail('source-changed');}});
  const bytes=fs.readFileSync(sealed);receipt.targetDigest=await digestBytes(bytes);
  const target=path.join(cfg.target,`${receipt.runId}.json`);
  await phase('deliver',()=>{let fd;try{fd=fs.openSync(target,'wx',0o600);fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}catch{fail('storage');}finally{if(fd!==undefined)fs.closeSync(fd);}});
  await phase('readback',async()=>{try{if(await digestBytes(fs.readFileSync(target))!==receipt.targetDigest||!(await runVerify({packageFile:target,keyFile:cfg.privateKey})).ok)fail('integrity');}catch{fail('integrity');}});
  receipt.ok=true;
 }catch(error){receipt.category=safeCategory(error);}
 receipt.endedAt=new Date().toISOString();
 const saveReceipt=()=>{if(jobDir)fs.writeFileSync(path.join(jobDir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});};
 try{saveReceipt();}catch{receipt.ok=false;receipt.category='storage';receipt.phases.push({name:'receipt',status:'fail',elapsedMs:0});}
 if(!receipt.ok){
  const event=sanitizeOperationsEvent({kind:'backup-failed',category:receipt.category,runId:receipt.runId});receipt.notification=await sendOperationsAlert(event,notification);
  try{if(jobDir&&receipt.notification.status!=='delivered')fs.writeFileSync(path.join(jobDir,'pending-alert.json'),JSON.stringify(event),{mode:0o600});saveReceipt();}catch{receipt.receiptPersisted=false;}
 }
 return receipt;
}
export async function rehearseOperations(){
 const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'nico-operations-drill-')));fs.chmodSync(dir,0o700);
 for(const name of ['input','work','target','keys'])fs.mkdirSync(path.join(dir,name),{mode:0o700});
 const keys=await generateBackupKeyPair();for(const [name,key] of [['public',keys.publicKey],['private',keys.privateKey]])fs.writeFileSync(path.join(dir,'keys',name),key,{mode:0o600});
 const state=emptyState();state.media=[{id:'drill-media',date:'2000-01-01',title:'隔离协议占位',type:'photo',url:'/uploads/protocol.bin'}];
 fs.mkdirSync(path.join(dir,'input/uploads'),{mode:0o700});fs.writeFileSync(path.join(dir,'input/uploads/protocol.bin'),new Uint8Array([1,2,3]),{mode:0o600});fs.writeFileSync(path.join(dir,'input/snapshot.json'),JSON.stringify({format:'nico-backup-v1',revision:1,data:state}),{mode:0o600});
 const job=await runOperations({schema:1,enabled:true,sourceDir:path.join(dir,'input'),workDir:path.join(dir,'work'),targetDir:path.join(dir,'target'),allowedTargetRoot:path.join(dir,'target'),recipientPublicKeyFile:path.join(dir,'keys/public'),verificationPrivateKeyFile:path.join(dir,'keys/private')});
 const result=await runRehearsal({workdir:dir});
 return {schema:1,mode:'isolated-protocol',ok:job.ok&&result.ok,category:!job.ok?job.category:result.ok?null:'integrity',phases:[...job.phases,...result.phases],counts:job.counts,productionRestore:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let receipt;try{
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--rehearse')receipt=await rehearseOperations();
  else if(args.length===2&&args[0]==='--config'&&path.isAbsolute(args[1]))receipt=await runOperations(JSON.parse(fs.readFileSync(args[1],'utf8')),{notification:{webhook:process.env.NICO_OPERATIONS_WEBHOOK,allowedHosts:(process.env.NICO_OPERATIONS_ALLOWED_HOSTS||'').split(',').map(s=>s.trim()).filter(Boolean)}});
  else receipt=await runOperations();
 }catch{receipt={schema:1,ok:false,category:'configuration'};}
 console.log(JSON.stringify(receipt));process.exitCode=receipt.ok?0:1;
}
