import {COLLECTIONS} from './domain.mjs';
import {recordReferences} from './data-quality.mjs';
export const ARCHIVE_FILE_LIMIT=50*1024*1024,ARCHIVE_PART_LIMIT=100*1024*1024;
const encoder=new TextEncoder(),json=v=>encoder.encode(JSON.stringify(v,null,2)),safeId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id);
export function archiveScope(data,year){
 if(!/^(?:19|20|21)\d{2}$/.test(year))throw Error('请选择1900–2199年份');
 const selected=new Map(),refs=new Map(),trash=data.trash||[],history=data.growthHistory||[];
 const find=(collection,id)=>{
  if(collection==='sessions'){const [planId]=String(id).split('/');return find('plans',planId);}
  for(const key of collection==='activity'?['swim','trainings']:collection==='any'?COLLECTIONS:[collection]){const row=data[key]?.find(r=>r.id===id)||trash.find(t=>t.collection===key&&t.record.id===id)?.record;if(row)return {collection:key,row};}return null;
 };
 const add=(collection,row)=>{if(row&&!selected.has(`${collection}/${row.id}`))selected.set(`${collection}/${row.id}`,{collection,row});};
 const inYear=row=>[row.date,row.deadline,row.startDate,row.endDate,row.createdAt,row.confirmedAt,row.period,row.year].some(v=>typeof v==='string'&&v.slice(0,4)===year)||(typeof row.startDate==='string'&&typeof row.endDate==='string'&&row.startDate<=`${year}-12-31`&&row.endDate>=`${year}-01-01`);
 for(const key of COLLECTIONS)for(const row of data[key]||[])if(inYear(row))add(key,row);
 for(const item of trash)if(inYear(item.record))add(item.collection,item.record);
 for(const item of selected.values()){
  const versions=[item.row,...history.filter(h=>h.collection===item.collection&&h.recordId===item.row.id).map(h=>h.record),...(item.collection==='plans'?(data.planHistory||[]).filter(p=>p.id===item.row.id):[])];
  for(const version of versions)for(const ref of recordReferences(item.collection,version)){const found=find(ref.collection,ref.id);refs.set(`${item.collection}/${item.row.id}/${ref.collection}/${ref.id}`,{from:{collection:item.collection,id:item.row.id},...ref,state:found?(trash.some(t=>t.collection===found.collection&&t.record.id===found.row.id)&&!data[found.collection]?.some(r=>r.id===found.row.id)?'deleted':'included'):'missing'});if(found)add(found.collection,found.row);}
 }
 const included=(key,id)=>selected.has(`${key}/${id}`),records=Object.fromEntries(COLLECTIONS.map(key=>[key,(data[key]||[]).filter(r=>included(key,r.id)).map(r=>structuredClone(r))]));
 return {format:'nico-year-archive-v1',year,private:true,restoreReady:false,scopeNote:'按年度事实及其跨年依赖保留；非整库恢复备份，不能直接覆盖档案。媒体元数据不代表已下载文件。',profile:structuredClone(data.profile),data:records,trash:structuredClone(trash.filter(t=>included(t.collection,t.record.id))),growthHistory:structuredClone(history.filter(h=>included(h.collection,h.recordId))),planHistory:structuredClone((data.planHistory||[]).filter(h=>included('plans',h.planId||h.recordId||h.id))),references:[...refs.values()]};
}
export function archiveCSV(fields,rows){const cell=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return '\ufeff'+[fields.map(cell).join(','),...rows.map(row=>fields.map(k=>cell(row[k])).join(','))].join('\r\n');}
export function archiveDataFiles(scope){return [{name:'archive.json',bytes:json(scope)},{name:'scores.csv',bytes:encoder.encode(archiveCSV(['id','date','stroke','kickTestType','distance','poolLength','timeMs','validityStatus','timingMethod','startType','recordType','trainingId','notes'],scope.data.swim))},{name:'trainings.csv',bytes:encoder.encode(archiveCSV(['id','date','session','completionStatus','durationMinutes','totalMeters','coachNotes','notes'],scope.data.trainings))},{name:'relations.json',bytes:json(scope.references)}];}
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
export function zipStore(files){
 if(files.length>65000)throw Error('归档条目过多，请缩小范围');const names=new Set(),locals=[],centers=[];let offset=0,centralSize=0;
 for(const file of files){if(!/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(file.name)||file.name.split('/').some(s=>s==='.'||s==='..')||names.has(file.name))throw Error('归档文件路径无效或重复');names.add(file.name);if(!(file.bytes instanceof Uint8Array)||file.bytes.length>ARCHIVE_PART_LIMIT)throw Error('归档文件过大');
  const name=encoder.encode(file.name),size=file.bytes.length,crc=crc32(file.bytes),local=new Uint8Array(30+name.length),l=new DataView(local.buffer);l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint16(12,33,true);l.setUint32(14,crc,true);l.setUint32(18,size,true);l.setUint32(22,size,true);l.setUint16(26,name.length,true);local.set(name,30);locals.push(local,file.bytes);
  const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,size,true);c.setUint32(24,size,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);centers.push(central);centralSize+=central.length;offset+=local.length+size;
 }
 const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);const result=new Uint8Array(offset+centralSize+22);let at=0;for(const chunk of [...locals,...centers,end]){result.set(chunk,at);at+=chunk.length;}return result;
}
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const cancelled=signal=>{if(signal?.aborted)throw new DOMException('导出已取消','AbortError');};
export async function* archiveParts({year,files,media=[],readMedia,signal,maxPartBytes=ARCHIVE_PART_LIMIT,id=crypto.randomUUID()}){
 if(!/^(?:19|20|21)\d{2}$/.test(year)||!safeId(id)||maxPartBytes>ARCHIVE_PART_LIMIT||maxPartBytes<2048)throw Error('归档范围或分卷上限无效');
 const failures=[],allFiles=[],partIndex=[];let partFiles=[],partSize=0,number=0;
 async function pack(){const listed=[];for(const f of partFiles)listed.push({name:f.name,size:f.bytes.length,sha256:await sha256(f.bytes),...(f.mediaId?{mediaId:f.mediaId}:{})});const manifest={format:'nico-archive-part-v1',archiveId:id,year,part:++number,files:listed};const bytes=zipStore([...partFiles,{name:'checksums.json',bytes:json(manifest)}]);if(bytes.length>maxPartBytes)throw Error('分卷超过上限，请缩小结构化资料范围');const part={kind:'part',number,name:`Nico-${year}-${id}-part-${number}.zip`,bytes,sha256:await sha256(bytes),size:bytes.length};allFiles.push(...listed);partIndex.push({number,name:part.name,sha256:part.sha256,size:part.size});partFiles=[];partSize=0;return part;}
 async function* add(file){if(file.bytes.length+2048>maxPartBytes)throw Error('单个文件超出分卷范围');if(partFiles.length&&(partSize+file.bytes.length+4096+(partFiles.length+1)*500)>maxPartBytes)yield await pack();partFiles.push(file);partSize+=file.bytes.length;}
 for(const file of files){cancelled(signal);for await(const part of add(file))yield part;}
 for(const m of media){cancelled(signal);if(!safeId(m.id))throw Error('媒体标识无效');try{let blob;for(let attempt=0;attempt<3;attempt++){try{blob=await readMedia(m.id,signal);break;}catch(e){cancelled(signal);if(e.status===401||e.status===403||attempt===2)throw e;}}cancelled(signal);if(blob.size>ARCHIVE_FILE_LIMIT)throw Error('单个媒体超过50MB');const ext={'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov','image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[blob.type]||'bin',bytes=new Uint8Array(await blob.arrayBuffer());for await(const part of add({name:`media/${m.id}.${ext}`,bytes,mediaId:m.id}))yield part;
 }catch(e){cancelled(signal);if(e.status===401||e.status===403)throw e;failures.push({id:m.id,reason:'媒体读取失败或超出大小限制，请单独重试；未包含此文件。'});}}
 cancelled(signal);if(partFiles.length)yield await pack();yield {kind:'index',format:'nico-archive-index-v1',archiveId:id,year,generatedAt:new Date().toISOString(),complete:!failures.length,files:allFiles,parts:partIndex,failures};
}
