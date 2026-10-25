// Read-only repository/index/history gate. Findings never include matched secret values.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const projectRoot=path.resolve(import.meta.dirname,'..');
const rules=[
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
 ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
 ['supabase-secret',/\bsb_secret_[A-Za-z0-9_-]{20,}/g],
 ['cloud-access-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
 ['vendor-secret',/\b(?:sk-proj-|sk-ant-api)[A-Za-z0-9_-]{25,}/g],
 ['database-credential',/(?:postgres(?:ql)?|mysql):\/\/[^\s:@/]+:[^\s@/]{6,}@/g],
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const jwtPattern=/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{15,}/g;
function safeName(name){let safe=name;for(const [,pattern] of rules)safe=safe.replace(new RegExp(pattern.source,'g'),'[redacted]');return safe.replace(new RegExp(jwtPattern.source,'g'),'[redacted-jwt]');}
const finding=(name,rule,line=1)=>({path:safeName(name),rule,line});
function pathRule(name){
 if(/^(?:data|review|legacy-archive|uploads|dist-private|release\.previous|release\.stage)\//.test(name)||/(?:^|\/)server\/db\.json$/.test(name)||/^(?:docs\/)?assets\/index\.js$/.test(name)||/^docs\/uploads\//.test(name))return 'private-path';
 if(/(?:^|\/)\.env(?:\..*)?$/.test(name)&&!name.endsWith('.example'))return 'environment-file';
 if(/(?:^|\/)(?:backup-private\.key|snapshot\.json|pending-alert\.json|receipt\.json|ops-[a-f0-9-]+\.json)$/.test(name)||/\.(?:pem|p12|pfx|key|jks)$/i.test(name))return 'private-key-file';
 if(/\.(?:sqlite(?:3)?(?:-(?:wal|shm))?|db(?:-(?:wal|shm))?|zip|tar|tgz|gz|bak|bundle)$/i.test(name))return 'private-archive';
 return null;
}
export function inspectContent(name,text){
 const result=[];
 for(const [rule,pattern] of rules)for(const hit of text.matchAll(new RegExp(pattern.source,'g')))result.push(finding(name,rule,text.slice(0,hit.index).split('\n').length));
 for(const hit of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{15,}/g)){
  try{const payload=JSON.parse(Buffer.from(hit[0].split('.')[1],'base64url'));if(payload.role==='service_role')result.push(finding(name,'service-role-jwt',text.slice(0,hit.index).split('\n').length));}catch{/* Non-JWT text is not a credential match. */}
 }
 if(name.endsWith('.json'))try{
  const parsed=JSON.parse(text),state=parsed?.format==='nico-backup-v1'?parsed.data:parsed;
  if(['nico-backup-v1','nico-backup-seal-v1'].includes(parsed?.format))result.push(finding(name,'private-backup'));
  if(state&&typeof state==='object'&&!Array.isArray(state)&&['growth','trainings','fitness','nutrition','goals','swim','media','skillAssessments','reportDrafts','yearbooks'].filter(k=>Array.isArray(state[k])).length>=3&&Object.values(state).some(v=>Array.isArray(v)&&v.length))result.push(finding(name,'private-dataset'));
 }catch{/* package metadata and JSON source fragments need no fact projection. */}
 return result;
}
function assetManifest(input,history=false){
 if(!input||input.schema!==1||!Array.isArray(input.files))throw Error('manifest');
 if(input.historicalFiles!==undefined&&!Array.isArray(input.historicalFiles))throw Error('manifest');
 const result=new Map(),seen=new Set();
 for(const [historical,list] of [[false,input.files],[true,input.historicalFiles||[]]])for(const item of list){
  const allowed=item&&(/^release\/(?:public-summary\.json|uploads\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(?:mp4|jpg))$/.test(item.path)||item.path==='src/assets/fonts/NotoSansSC-Regular.ttf'||historical&&item.path==='src/assets/hero.png');
  if(!allowed||!/^[a-f0-9]{64}$/.test(item.sha256)||seen.has(`${item.path}:${item.sha256}`))throw Error('manifest');seen.add(`${item.path}:${item.sha256}`);
  if(!historical||history){if(!result.has(item.path))result.set(item.path,new Set());result.get(item.path).add(item.sha256);}
 }return result;
}
export function scanRepository({root=projectRoot,staged=false,history=false,revision,secretsOnly=false,manifest}={}){
 const findings=[];let checked=0;
 const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024});
 try{
  if(staged&&history)throw Error('mode');
  if(revision!==undefined&&(!history||!/^[a-f0-9]{40,64}$/.test(revision)))throw Error('revision');
  let approved=new Map();if(!secretsOnly){if(manifest===undefined){let bytes;if(staged){try{bytes=git('show',':security/public-assets.json');}catch{bytes=fs.readFileSync(path.join(root,'security/public-assets.json'));}}else bytes=fs.readFileSync(path.join(root,'security/public-assets.json'));manifest=JSON.parse(bytes);}approved=assetManifest(manifest,history);}
  // rev-list --objects reports only one name per blob and misses renamed/copied paths.
  // Inspect each unique (path, blob, mode) in every tree instead.
  const historyEntries=()=>git('rev-list',revision||'--all').toString().trim().split('\n').filter(Boolean).flatMap(commit=>git('ls-tree','-r','-z',commit).toString().split('\0').filter(Boolean).map(row=>{const p=row.indexOf('\t'),[mode,type,oid]=row.slice(0,p).split(' ');return {name:row.slice(p+1),oid,mode,type};}));
  const entries=history?historyEntries():
   git(...(staged?['diff','--cached','--name-only','-z','--diff-filter=ACMR']:['ls-files','--cached','--others','--exclude-standard','-z'])).toString().split('\0').filter(Boolean).map(name=>({name}));
  const seen=new Set();
  for(const entry of entries){
   const {name,oid}=entry,key=history?`${name}:${oid}:${entry.mode}`:name;if(seen.has(key))continue;seen.add(key);
   if(history&&(!['100644','100755'].includes(entry.mode)||entry.type!=='blob')){findings.push(finding(name,'non-regular-file'));continue;}
   checked++;const denied=!secretsOnly&&pathRule(name);if(denied)findings.push(finding(name,denied));
   let bytes;
   if(history){const size=Number(git('cat-file','-s',oid).toString());if(size>60*1024*1024){findings.push(finding(name,'file-too-large'));continue;}bytes=git('cat-file','blob',oid);}
   else if(staged){const mode=git('ls-files','--stage','--',name).toString().split(' ')[0];if(!['100644','100755'].includes(mode)){findings.push(finding(name,'non-regular-file'));continue;}bytes=git('show',`:${name}`);}
   else{const file=path.join(root,name);let stat;try{stat=fs.lstatSync(file);}catch(error){if(error.code==='ENOENT')continue;throw error;}if(stat.isSymbolicLink()||!stat.isFile()){findings.push(finding(name,'non-regular-file'));continue;}bytes=fs.readFileSync(file);}
   if(!secretsOnly){
    if(approved.has(name)&&!approved.get(name).has(sha(bytes)))findings.push(finding(name,'public-asset-changed'));
    if((/^release\//.test(name)||/\.(?:mp4|mov|webm|m4v|avi|png|jpe?g|gif|webp|heic)$/i.test(name))&&!approved.has(name))findings.push(finding(name,'unauthorized-asset'));
   }
   const binary=/\.(?:mp4|mov|webm|m4v|avi|png|jpe?g|gif|webp|heic|ttf|woff2?)$/i.test(name);
   if(!binary){if(bytes.length>3*1024*1024)findings.push(finding(name,'text-too-large'));else if(bytes.includes(0))findings.push(finding(name,'uninspectable-content'));else findings.push(...inspectContent(name,bytes.toString('utf8')).filter(f=>!secretsOnly||f.rule!=='private-dataset'));}
  }
  return {schema:1,scope:history?(secretsOnly?'reachable-history-secrets':'reachable-history'):(staged?'staged':'working-tree'),ok:findings.length===0,checked,findings};
 }catch{return {schema:1,ok:false,checked,findings:[...findings,{path:'[configuration]',rule:'scan-incomplete',line:1}]};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const raw=process.argv.slice(2),args=[],options={};for(let i=0;i<raw.length;i++){if(raw[i]==='--revision')options.revision=raw[++i]||'';else args.push(raw[i]);}let result;
 if(args.some(a=>!['--staged','--history','--secrets-only'].includes(a)))result={schema:1,ok:false,findings:[{rule:'invalid-options'}]};
 else result=scanRepository({...options,staged:args.includes('--staged'),history:args.includes('--history'),secretsOnly:args.includes('--secrets-only')});
 console.log(JSON.stringify(result));process.exitCode=result.ok?0:1;
}
