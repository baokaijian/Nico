// V1.6 存储与导出观测基线：只读聚合本地对象数量/字节/类型分布，并与上一份回执对比增量。
// 单时点观测不构成阈值或SLA；云端对象数用 scripts/operations-queries.mjs 的只读SQL核对。
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export function storageReport({dir,previous=null,now=new Date().toISOString()}={}){
 if(!dir||!fs.existsSync(dir))throw Error('对象目录不存在');
 let objects=0,bytes=0;const byType={};
 const walk=current=>{for(const entry of fs.readdirSync(current,{withFileTypes:true})){
  const full=path.join(current,entry.name);
  if(entry.isDirectory())walk(full);
  else{const stat=fs.statSync(full);objects++;bytes+=stat.size;const ext=path.extname(entry.name).slice(1).toLowerCase()||'none';byType[ext]=(byType[ext]??{objects:0,bytes:0});byType[ext].objects++;byType[ext].bytes+=stat.size;}
 }};
 walk(path.resolve(dir));
 const report={schema:1,taskType:'storage-baseline',generatedAt:now,scope:'local-dir',objects,bytes,byType:Object.fromEntries(Object.entries(byType).sort(([a],[b])=>a<b?-1:1)),note:'只读单时点基线；阈值需真实运营周期观测后确定'};
 if(previous){
  const prior=JSON.parse(fs.readFileSync(previous,'utf8'));
  report.vsPrevious={generatedAt:prior.generatedAt??null,objectsDelta:objects-(prior.objects??0),bytesDelta:bytes-(prior.bytes??0)};
 }
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const options=Object.fromEntries(process.argv.slice(2).map((value,index)=>value.startsWith('--')?[value.slice(2),process.argv.slice(2)[index+1]]:null).filter(Boolean));
 const report=storageReport({dir:options.dir,previous:options.previous??null});
 const text=JSON.stringify(report,null,2)+'\n';
 if(options.out){fs.mkdirSync(path.dirname(options.out),{recursive:true});fs.writeFileSync(options.out,text);}
 console.log(text);
}
