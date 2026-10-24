// V1.6 脱敏监控：固定白名单事件净化与永不阻塞业务的外发队列。
// 只保留封闭词汇字段；URL、query、姓名、训练文本、影像地址、令牌、完整异常栈一律丢弃。
// 本模块不得进入 Edge 函数依赖图；接入真实监控目的地前保持未启用。
export const HEALTH_EVENT='nico_health_v1';
export const HEALTH_GROUPS=new Set(['login','session','health','publicRead','mediaRead','upload','processing','processingFailure','backup','restore','read','write','other']);
export const ERROR_CATEGORIES=new Set(['crypto','integrity','network','storage','format','internal']);
const runIdPattern=/^[A-Za-z0-9_-]{1,100}$/,versionPattern=/^[0-9A-Za-z][0-9A-Za-z.+-]{0,31}$/;
export function sanitizeHealthEvent(event){
 if(!event||event.event!==HEALTH_EVENT)return null;
 if(!HEALTH_GROUPS.has(event.group))return null;
 const status=Number.isInteger(event.status)&&event.status>=100&&event.status<=599?event.status:0;
 const durationMs=Number.isFinite(event.durationMs)?Math.max(0,Math.min(300000,Math.round(event.durationMs))):0;
 return {event:HEALTH_EVENT,group:event.group,status,durationMs};
}
export function sanitizeErrorReport(report){
 if(!report||!ERROR_CATEGORIES.has(report.category))return null;
 const count=Number.isInteger(report.count)&&report.count>0&&report.count<=1e9?report.count:1;
 return {event:'nico_error_v1',category:report.category,runId:runIdPattern.test(report.runId||'')?report.runId:'',version:versionPattern.test(report.version||'')?report.version:'',count};
}
export function createTelemetrySink({send,now=Date.now,retryMs=60000,queueLimit=100}={}){
 if(typeof send!=='function')throw Error('外发函数无效');
 let queue=[],sending=false,sent=0,dropped=0,failures=0,lastSuccessAt=null,lastAttemptAt=null;
 const flush=async()=>{if(sending)return;sending=true;try{
  while(queue.length){lastAttemptAt=now();try{await send(queue[0]);sent++;lastSuccessAt=now();failures=0;queue.shift();}catch{failures++;break;}}
 }catch{/* 监控自身故障不得影响业务 */}finally{sending=false;}};
 return {
  push(event){const clean=sanitizeHealthEvent(event);if(!clean||queue.length>=queueLimit){dropped++;return false;}queue.push(clean);flush();return true;},
  retry(){flush();},
  snapshot(){return {schema:1,queue:queue.length,sent,dropped,failures,lastAttemptAt,lastSuccessAt,heartbeatStale:lastSuccessAt!==null&&now()-lastSuccessAt>retryMs*3};},
 };
}
