// V1.6 离站备份的认证加密与完整性校验。仅用 WebCrypto（ECDH P-256 + HKDF-SHA256 + AES-256-GCM），不新增依赖。
// 私有运行器与隔离测试使用；本模块不得进入 Edge 函数依赖图，也不得被打进公开前端产物。
const encoder=new TextEncoder(),decoder=new TextDecoder();
export const BACKUP_FORMAT='nico-backup-seal-v1';
const subtle=()=>{const c=globalThis.crypto?.subtle;if(!c)throw Error('当前运行环境缺少 WebCrypto，无法加密备份');return c;};
export function toBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s);}
export function fromBase64(text){const s=atob(text),bytes=new Uint8Array(s.length);for(let i=0;i<s.length;i++)bytes[i]=s.charCodeAt(i);return bytes;}
export async function digestBytes(bytes){return toBase64(new Uint8Array(await subtle().digest('SHA-256',bytes)));}
export async function generateBackupKeyPair(){
 const c=subtle(),pair=await c.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 return {publicKey:toBase64(new Uint8Array(await c.exportKey('raw',pair.publicKey))),privateKey:toBase64(new Uint8Array(await c.exportKey('pkcs8',pair.privateKey)))};
}
const importPublic=base64=>subtle().importKey('raw',fromBase64(base64),{name:'ECDH',namedCurve:'P-256'},false,[]);
const importPrivate=base64=>subtle().importKey('pkcs8',fromBase64(base64),{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
async function deriveEntryKey(privateKey,publicKey,purpose){
 const secret=await subtle().deriveBits({name:'ECDH',public:publicKey},privateKey,256);
 const material=await subtle().importKey('raw',secret,'HKDF',false,['deriveKey']);
 return subtle().deriveKey({name:'HKDF',hash:'SHA-256',salt:encoder.encode(BACKUP_FORMAT),info:encoder.encode(purpose)},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
const aad=(archiveId,index,name)=>encoder.encode(JSON.stringify([BACKUP_FORMAT,archiveId,index,name]));
const validName=name=>typeof name==='string'&&/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(name)&&!name.split('/').some(s=>s==='.'||s==='..');
export async function sealBackupFiles({files,recipientPublicKey,info={},archiveId=crypto.randomUUID(),now=new Date().toISOString()}){
 if(!Array.isArray(files)||!files.length)throw Error('备份没有可加密的文件');
 const names=new Set();
 for(const file of files){
  if(!validName(file.name))throw Error(`备份文件名无效：${file.name}`);
  if(names.has(file.name))throw Error(`备份文件名重复：${file.name}`);
  if(!(file.bytes instanceof Uint8Array)||!file.bytes.length)throw Error(`备份文件内容无效：${file.name}`);
  names.add(file.name);
 }
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(archiveId))throw Error('备份标识无效');
 const ephemeral=await subtle().generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
 const ephemeralPublicKey=toBase64(new Uint8Array(await subtle().exportKey('raw',ephemeral.publicKey)));
 const recipient=await importPublic(recipientPublicKey);
 const manifest={format:BACKUP_FORMAT,archiveId,createdAt:now,...structuredClone(info),files:[]};
 for(const file of files)manifest.files.push({name:file.name,size:file.bytes.length,sha256:await digestBytes(file.bytes)});
 manifest.objectCount=manifest.files.length;manifest.totalBytes=manifest.files.reduce((sum,file)=>sum+file.size,0);
 const manifestBytes=encoder.encode(JSON.stringify(manifest,null,2));
 const seal=async(name,bytes,index)=>{
  const key=await deriveEntryKey(ephemeral.privateKey,recipient,`${archiveId}:${index}:${name}`);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=new Uint8Array(await subtle().encrypt({name:'AES-GCM',iv,additionalData:aad(archiveId,index,name)},key,bytes));
  return {name,index,iv:toBase64(iv),data:toBase64(data)};
 };
 const entries=[await seal('manifest.json',manifestBytes,0)];
 for(let index=0;index<files.length;index++)entries.push(await seal(files[index].name,files[index].bytes,index+1));
 return {format:BACKUP_FORMAT,archiveId,createdAt:now,cipher:'AES-256-GCM',kdf:'ECDH-P256+HKDF-SHA256',ephemeralPublicKey,manifestSha256:await digestBytes(manifestBytes),entries};
}
export async function openBackupPackage(pkg,recipientPrivateKey,{now=new Date().toISOString(),maxAgeDays=null}={}){
 const fail=(category,extra={})=>({ok:false,category,manifest:null,files:[],problems:[{category,...extra}]});
 if(!pkg||pkg.format!==BACKUP_FORMAT||!/^[A-Za-z0-9_-]{1,100}$/.test(pkg.archiveId||'')||!Array.isArray(pkg.entries)||!pkg.entries.length)return fail('bad-format');
 let recipient,ephemeral;
 try{recipient=await importPrivate(recipientPrivateKey);ephemeral=await importPublic(pkg.ephemeralPublicKey);}
 catch{return fail('wrong-key');}
 const open=async entry=>{
  const key=await deriveEntryKey(recipient,ephemeral,`${pkg.archiveId}:${entry.index}:${entry.name}`);
  try{const plain=await subtle().decrypt({name:'AES-GCM',iv:fromBase64(entry.iv),additionalData:aad(pkg.archiveId,entry.index,entry.name)},key,fromBase64(entry.data));return new Uint8Array(plain);}
  catch{return null;}
 };
 const manifestEntry=pkg.entries.find(entry=>entry.name==='manifest.json'&&entry.index===0);
 if(!manifestEntry)return fail('missing-entry',{name:'manifest.json'});
 const manifestBytes=await open(manifestEntry);
 if(!manifestBytes)return fail('wrong-key');
 let manifest;
 try{manifest=JSON.parse(decoder.decode(manifestBytes));}catch{return fail('bad-format');}
 if(manifest.format!==BACKUP_FORMAT||manifest.archiveId!==pkg.archiveId||!Array.isArray(manifest.files)||!manifest.files.length)return fail('bad-format');
 if(new Set(manifest.files.map(file=>file.name)).size!==manifest.files.length)return fail('bad-format');
 if(await digestBytes(manifestBytes)!==pkg.manifestSha256)return fail('tampered');
 const problems=[],files=[];
 for(const [position,meta] of manifest.files.entries()){
  const entry=pkg.entries.find(item=>item.index===position+1&&item.name===meta.name);
  if(!entry){problems.push({category:'missing-entry',name:meta.name});continue;}
  const bytes=await open(entry);
  if(!bytes){problems.push({category:'tampered',name:meta.name});continue;}
  if(bytes.length!==meta.size||await digestBytes(bytes)!==meta.sha256){problems.push({category:'tampered',name:meta.name});continue;}
  files.push({name:meta.name,bytes});
 }
 const declared=new Set(manifest.files.map(file=>file.name));
 for(const entry of pkg.entries)if(entry.index!==0&&!declared.has(entry.name)&&!problems.some(problem=>problem.name===entry.name))problems.push({category:'extra-entry',name:entry.name});
 if(problems.length)return {ok:false,category:problems[0].category,manifest,files,problems};
 if(maxAgeDays!=null&&(!Number.isFinite(maxAgeDays)||maxAgeDays<0))return fail('bad-format');
 if(maxAgeDays!=null&&Date.parse(now)-Date.parse(pkg.createdAt)>maxAgeDays*86400000)return {ok:false,category:'stale-backup',manifest,files,problems:[]};
 return {ok:true,category:null,manifest,files,problems:[]};
}
