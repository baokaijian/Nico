// V1.6 备份作业合同：seal 离站加密打包 / verify 完整性校验 / rehearse 隔离恢复演练。
// 回执只含运行标识、阶段状态、数量与摘要，不含档案内容或密钥；输出目录禁止落在公开产物或真实档案目录。
// 真实离站目的地、保管人与定时调度尚未启用，见 docs/v1-6-reliability-design.md。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sealBackupFiles, openBackupPackage, generateBackupKeyPair, digestBytes } from '../shared/backup-crypto.mjs';
import { normalizeState } from '../shared/domain.mjs';
const projectRoot=path.resolve(import.meta.dirname,'..');
const MAX_FILE_BYTES=100*1024*1024,MAX_FILES=500;
export function assertSafeOutputDir(target){
 const resolved=path.resolve(target);
 let existing=resolved;while(!fs.existsSync(existing)){const parent=path.dirname(existing);if(parent===existing)break;existing=parent;}
 const physical=path.resolve(fs.realpathSync(existing),path.relative(existing,resolved)),root=fs.realpathSync(projectRoot);
 if(physical===root||physical.startsWith(root+path.sep)||resolved===projectRoot||resolved.startsWith(projectRoot+path.sep))throw Error('输出目录不能落在仓库内，请使用仓库外的私有目录');
 return resolved;
}
function privateDirectory(target){
 const dir=assertSafeOutputDir(target);fs.mkdirSync(dir,{recursive:true,mode:0o700});
 if(fs.statSync(dir).mode&0o077)throw Error('备份输出目录须为私有目录（权限0700）');return dir;
}
function writePrivate(file,bytes,{exclusive=false}={}){
 let fd;
 try{
  assertSafeOutputDir(path.dirname(file));
  fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_NOFOLLOW|(exclusive?fs.constants.O_EXCL:0),0o600);
  const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.nlink!==1)throw Error();
  fs.fchmodSync(fd,0o600);fs.ftruncateSync(fd,0);fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);
 }catch{throw Error('备份文件写入被拒绝：目标须为私有普通文件，禁止链接或覆盖已有密钥');}
 finally{if(fd!==undefined)fs.closeSync(fd);}
}
export function collectFiles(inputDir){
 const files=[],root=path.resolve(inputDir);
 const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(entry.name.startsWith('.'))continue;
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full);
  else{const bytes=new Uint8Array(fs.readFileSync(full));if(bytes.length>MAX_FILE_BYTES)throw Error(`单个文件超出上限：${path.relative(root,full)}`);files.push({name:path.relative(root,full).split(path.sep).join('/'),bytes});}
 }};
 walk(root);files.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
 if(!files.length)throw Error('输入目录没有可备份文件');
 if(files.length>MAX_FILES)throw Error(`文件数量 ${files.length} 超出单包上限 ${MAX_FILES}`);
 return files;
}
const phase=async(receipt,name,run)=>{const startedAt=Date.now();try{const detail=await run();receipt.phases.push({name,status:'pass',elapsedMs:Date.now()-startedAt});return detail;}catch(error){receipt.phases.push({name,status:'fail',elapsedMs:Date.now()-startedAt});throw error;}};
const baseReceipt=(taskType,runId)=>({schema:1,taskType,runId,startedAt:new Date().toISOString(),endedAt:null,source:null,targetDigest:null,phases:[],ok:false,failCategory:null,counts:null,nextRetryAt:null,lastSuccessAt:null});
const finish=(receipt,ok,{failCategory=null,counts=null,targetDigest=null,source=null}={})=>{receipt.endedAt=new Date().toISOString();receipt.ok=ok;receipt.failCategory=failCategory;receipt.counts=counts;receipt.targetDigest=targetDigest;receipt.source=source;receipt.lastSuccessAt=ok?receipt.endedAt:receipt.lastSuccessAt;return receipt;};
export function writeReceipt(outDir,receipt){const dir=privateDirectory(outDir);writePrivate(path.join(dir,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');return path.join(dir,'receipt.json');}
export async function runKeygen({outDir}){
 const runId=crypto.randomUUID(),receipt=baseReceipt('keygen',runId);
 try{
  const pair=await phase(receipt,'generate',()=>generateBackupKeyPair());
  const dir=privateDirectory(outDir);
  for(const name of ['backup-public.key','backup-private.key']){try{fs.lstatSync(path.join(dir,name));throw Error('拒绝覆盖已有密钥文件');}catch(error){if(error.code!=='ENOENT')throw error;}}
  await phase(receipt,'write',()=>{writePrivate(path.join(dir,'backup-public.key'),pair.publicKey+'\n',{exclusive:true});writePrivate(path.join(dir,'backup-private.key'),pair.privateKey+'\n',{exclusive:true});});
  return finish(receipt,true,{counts:{keyFiles:2}});
 }catch(error){return finish(receipt,false,{failCategory:error.message});}
}
const readKey=file=>fs.readFileSync(file,'utf8').trim();
export async function runSeal({inputDir,keyFile,outDir,info={},now=new Date().toISOString()}){
 const runId=crypto.randomUUID(),receipt=baseReceipt('seal',runId);
 try{
  let files,pkg;
  await phase(receipt,'read',()=>{files=collectFiles(inputDir);});
  await phase(receipt,'encrypt',async()=>{pkg=await sealBackupFiles({files,recipientPublicKey:readKey(keyFile),info,archiveId:runId,now});});
  const envelope=JSON.stringify(pkg);
  await phase(receipt,'write',()=>{const dir=privateDirectory(outDir);writePrivate(path.join(dir,'package.json'),envelope+'\n');});
  return finish(receipt,true,{counts:{files:pkg.entries.length-1,bytes:pkg.entries.reduce((sum,entry)=>sum+entry.data.length,0)},targetDigest:await digestBytes(new TextEncoder().encode(envelope)),source:{revision:info.revision??null,release:info.release??null}});
 }catch(error){return finish(receipt,false,{failCategory:error.message});}
}
export async function runVerify({packageFile,keyFile,maxAgeDays=null,now=new Date().toISOString()}){
 const runId=crypto.randomUUID(),receipt=baseReceipt('verify',runId);
 try{
  let result,envelope;
  await phase(receipt,'read',()=>{envelope=fs.readFileSync(packageFile,'utf8');});
  await phase(receipt,'decrypt',async()=>{result=await openBackupPackage(JSON.parse(envelope),readKey(keyFile),{now,maxAgeDays});});
  if(!result.ok)return finish(receipt,false,{failCategory:result.category,counts:{files:result.manifest?.files?.length??0}});
  return finish(receipt,true,{counts:{files:result.files.length,bytes:result.files.reduce((sum,file)=>sum+file.bytes.length,0)},targetDigest:await digestBytes(new TextEncoder().encode(envelope))});
 }catch(error){return finish(receipt,false,{failCategory:error.message});}
}
export function protocolSampleState(){
 // 演练专用确定性协议样本；仅隔离环境使用，不是儿童事实，不得写入正式档案。
 const state=normalizeState({swim:[{id:'drill-swim-1',date:'2000-01-01',distance:'50m',stroke:'自由泳',time:'01:10.00',seconds:70,poolLength:'50m',notes:'演练样本'}],goals:[{id:'drill-goal-1',title:'演练目标',targetMetric:'样本'}],media:[{id:'drill-media-1',date:'2000-01-02',title:'演练素材占位',type:'video',url:'/uploads/drill.mp4',description:''}]});
 const records=Object.values(state).filter(Array.isArray).reduce((sum,list)=>sum+list.length,0);
 return {state,records};
}
export async function runRehearsal({workdir=null}={}){
 const runId=crypto.randomUUID(),receipt=baseReceipt('rehearse',runId);
 try{
  const dir=workdir?fs.mkdtempSync(path.join(privateDirectory(workdir),'drill-')):fs.mkdtempSync(path.join(os.tmpdir(),'nico-backup-drill-'));
  const {openStore}=await import('../server/store.mjs');
  const sample=await phase(receipt,'sample',()=>protocolSampleState());
  fs.mkdirSync(dir,{recursive:true});
  writePrivate(path.join(dir,'seed.json'),JSON.stringify(sample.state));
  let source;
  await phase(receipt,'source-read',()=>{const store=openStore({filename:path.join(dir,'source.sqlite'),seedPath:path.join(dir,'seed.json'),backupDir:path.join(dir,'backups')});source={revision:store.read().revision,data:store.read().data};store.close();});
  const snapshotBytes=new TextEncoder().encode(JSON.stringify({format:'nico-backup-v1',revision:source.revision,data:source.data},null,2));
  const holder=await phase(receipt,'keygen',()=>generateBackupKeyPair());
  const wrongHolder=await phase(receipt,'keygen-wrong',()=>generateBackupKeyPair());
  let pkg;
  await phase(receipt,'seal',async()=>{pkg=await sealBackupFiles({files:[{name:'snapshot.json',bytes:snapshotBytes},{name:'media/drill-media-1.txt',bytes:new TextEncoder().encode('演练对象占位，不是真实素材')}],recipientPublicKey:holder.publicKey,info:{taskType:'rehearsal',sourceRevision:source.revision},archiveId:runId});});
  let opened;
  await phase(receipt,'verify',async()=>{opened=await openBackupPackage(pkg,holder.privateKey);if(!opened.ok)throw Error(`完整性校验失败：${opened.category}`);});
  await phase(receipt,'wrong-key',async()=>{const wrong=await openBackupPackage(pkg,wrongHolder.privateKey);if(wrong.ok||wrong.category!=='wrong-key')throw Error('错误密钥未被识别');});
  await phase(receipt,'tampered',async()=>{const bad=structuredClone(pkg);const entry=bad.entries.at(-1);entry.data=entry.data.slice(0,-4)+(entry.data.endsWith('AAAA')?'BBBB':'AAAA');const check=await openBackupPackage(bad,holder.privateKey);if(check.ok||check.category!=='tampered')throw Error('篡改未被识别');});
  await phase(receipt,'missing-entry',async()=>{const bad=structuredClone(pkg);bad.entries=bad.entries.filter(entry=>entry.name!=='media/drill-media-1.txt');const check=await openBackupPackage(bad,holder.privateKey);if(check.ok||check.category!=='missing-entry')throw Error('缺卷未被识别');});
  await phase(receipt,'stale',async()=>{const old=await sealBackupFiles({files:[{name:'snapshot.json',bytes:snapshotBytes}],recipientPublicKey:holder.publicKey,archiveId:runId+'-old',now:new Date(Date.now()-3*86400000).toISOString()});const check=await openBackupPackage(old,holder.privateKey,{maxAgeDays:1});if(check.ok||check.category!=='stale-backup')throw Error('过期备份未被识别');});
  const restoredFile=opened.files.find(file=>file.name==='snapshot.json');
  await phase(receipt,'restore',async()=>{
   const snapshot=JSON.parse(new TextDecoder().decode(restoredFile.bytes));
   if(snapshot.format!=='nico-backup-v1'||snapshot.revision!==source.revision)throw Error('恢复快照格式或版本与源不一致');
   const restoreDir=path.join(dir,'restore');fs.mkdirSync(restoreDir,{recursive:true});
   writePrivate(path.join(restoreDir,'seed.json'),JSON.stringify(snapshot.data));
   const store=openStore({filename:path.join(restoreDir,'restored.sqlite'),seedPath:path.join(restoreDir,'seed.json'),backupDir:path.join(restoreDir,'backups')});
   const restored=store.read();store.close();
   const sourceDigest=await digestBytes(new TextEncoder().encode(JSON.stringify(normalizeState(source.data))));
   const restoredDigest=await digestBytes(new TextEncoder().encode(JSON.stringify(normalizeState(restored.data))));
   if(restoredDigest!==sourceDigest)throw Error('恢复内容与源摘要不一致');
  });
  const envelope=JSON.stringify(pkg);
  return finish(receipt,true,{counts:{files:pkg.entries.length-1,bytes:snapshotBytes.length,records:sample.records},targetDigest:await digestBytes(new TextEncoder().encode(envelope)),source:{revision:source.revision,release:null}});
 }catch(error){return finish(receipt,false,{failCategory:error.message});}
}
const usage='用法：backup-job.mjs keygen|seal|verify|rehearse …（见 docs/v1-6-acceptance.md）';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [command,...rest]=process.argv.slice(2),options=Object.fromEntries(rest.map((value,index)=>value.startsWith('--')?[value.slice(2),rest[index+1]]:null).filter(Boolean));
 let receipt;
 if(command==='keygen')receipt=await runKeygen({outDir:options['out-dir']});
 else if(command==='seal')receipt=await runSeal({inputDir:options.input,keyFile:options.key,outDir:options.out,info:{revision:options.revision?Number(options.revision):null,release:options.release??null}});
 else if(command==='verify')receipt=await runVerify({packageFile:options.package,keyFile:options.key,maxAgeDays:options['max-age-days']!=null?Number(options['max-age-days']):null});
 else if(command==='rehearse')receipt=await runRehearsal({workdir:options.workdir??null});
 else{console.error(usage);process.exit(2);}
 console.log(JSON.stringify(receipt));
 if(options['out-dir']||options.out||options.workdir)try{writeReceipt(options['out-dir']||options.out||options.workdir,receipt);}catch{/* 回执目录无效时仅打印，不掩盖作业结果 */}
 process.exitCode=receipt.ok?0:1;
}
