// Private, manually reviewed timing-condition decisions. Does not alter performance eligibility.
import {missingScoreConditions} from './score-conditions.mjs';
const keys=['startType','timingMethod','recordType','poolLength'];
const metadata=['conditionsKeptUnknownAt','conditionsKeptUnknownBy','conditionsKeptUnknownNote'];
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const text=(v,max)=>typeof v==='string'&&v.trim()&&v.length<=max;
const conditions=r=>Object.fromEntries(keys.map(k=>[k,r[k]||'']));
export function decisionInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['action','reviewedBy','reason','clientRequestId'].includes(k)))fail('裁决字段无效，系统审计不能直接填写');
 if(!['keep','reopen'].includes(input.action)||!text(input.reviewedBy,50)||!text(input.reason,1000)||typeof input.clientRequestId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(input.clientRequestId))fail('请填写裁决人、核对依据和有效请求标识');
 return {action:input.action,reviewedBy:input.reviewedBy.trim(),reason:input.reason.trim(),clientRequestId:input.clientRequestId};
}
export function decisionReplay(row,input,actor){
 const event=(row.conditionsDecisionHistory||[]).find(e=>e.id===input.clientRequestId);if(!event)return false;
 if(event.actor!==actor||event.action!==input.action||event.reviewedBy!==input.reviewedBy||event.reason!==input.reason)fail('此裁决请求已保存不同内容，请刷新核对',409);
 return true;
}
function clear(row){for(const k of metadata)delete row[k];}
function append(row,input,{actor,now}){
 if(!text(actor,100)||!Number.isFinite(Date.parse(now)))fail('裁决审计上下文无效');
 row.conditionsDecisionHistory=[...(row.conditionsDecisionHistory||[]),{id:input.clientRequestId,version:(row.conditionsDecisionHistory?.length||0)+1,action:input.action,reviewedBy:input.reviewedBy,reason:input.reason,actor,at:now,conditions:conditions(row)}];
}
export function applyScoreDecision(row,input,ctx){
 validateDecisionHistory(row);
 if(decisionReplay(row,input,ctx.actor))return row;
 if(input.action==='keep'){
  if(!missingScoreConditions(row).length)fail('条件已经完整，无需按未知保留',409);
  if(row.conditionsKeptUnknownAt)fail('此记录已有裁决，请先核对或撤销原决定',409);
 }else if(!row.conditionsKeptUnknownAt)fail('当前没有可撤销的裁决',409);
 append(row,input,ctx);clear(row);
 if(input.action==='keep')Object.assign(row,{conditionsKeptUnknownAt:ctx.now.slice(0,10),conditionsKeptUnknownBy:input.reviewedBy,conditionsKeptUnknownNote:input.reason});
 Object.assign(row,{updatedBy:ctx.actor,updatedAt:ctx.now});return row;
}
export function expireScoreDecision(previous,next,ctx){
 if(previous.conditionsKeptUnknownAt&&canonical(conditions(previous))!==canonical(conditions(next))){
  clear(next);append(next,{action:'expire',reviewedBy:ctx.actor,reason:'计时条件发生改变，原裁决失效，需重新核对',clientRequestId:crypto.randomUUID()},ctx);
 }
 return next;
}
export function validateDecisionHistory(row){
 const history=row.conditionsDecisionHistory;
 if(history!==undefined){
  if(!Array.isArray(history)||history.length>10000)fail('裁决审计历史格式无效');
  const seen=new Set();for(const [i,e]of history.entries()){
   if(!e||Object.keys(e).some(k=>!['id','version','action','reviewedBy','reason','actor','at','conditions'].includes(k))||!text(e.id,100)||seen.has(e.id)||e.version!==i+1||!['keep','reopen','expire'].includes(e.action)||!text(e.reviewedBy,100)||!text(e.reason,1000)||!text(e.actor,100)||typeof e.at!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(e.at)||!Number.isFinite(Date.parse(e.at))||!e.conditions||Object.keys(e.conditions).length!==4||keys.some(k=>typeof e.conditions[k]!=='string'))fail('裁决审计历史条目无效');seen.add(e.id);
  }
 }
 if(row.conditionsKeptUnknownAt!==undefined){
  const at=row.conditionsKeptUnknownAt;
  if(typeof at!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(at)||new Date(at+'T00:00:00Z').toISOString().slice(0,10)!==at||!text(row.conditionsKeptUnknownBy,50))fail('当前裁决信息无效');
 }
 if(history?.length){const last=history.at(-1),active=!!row.conditionsKeptUnknownAt;if(active!==(last.action==='keep')||active&&(row.conditionsKeptUnknownBy!==last.reviewedBy||row.conditionsKeptUnknownAt!==last.at.slice(0,10)||row.conditionsKeptUnknownNote!==last.reason||canonical(conditions(row))!==canonical(last.conditions)))fail('当前裁决状态与审计历史不一致');}
}
export function retainScoreDecisions(previous,next,ctx){
 const all=d=>[...(d.swim||[]),...(d.trash||[]).filter(t=>t.collection==='swim').map(t=>t.record)];
 const current=new Map(all(previous).map(r=>[r.id,r]));
 const present=new Set(all(next).map(r=>r.id));next.trash||=[];
 for(const prior of current.values())if(prior.conditionsDecisionHistory?.length&&!present.has(prior.id)){
  const oldTrash=(previous.trash||[]).find(t=>t.collection==='swim'&&t.record.id===prior.id);
  next.trash.push(oldTrash?structuredClone(oldTrash):{id:`retained-swim-${prior.id}`,collection:'swim',record:structuredClone(prior),deletedAt:ctx.now,deletedBy:ctx.actor});
 }
 for(const row of all(next)){
  const prior=current.get(row.id);if(!prior)continue;
  const old=prior.conditionsDecisionHistory||[],incoming=row.conditionsDecisionHistory||[];
  if(incoming.length>old.length)fail('备份包含服务端未核实的裁决审计扩展',409);
  for(let i=0;i<Math.min(old.length,incoming.length);i++)if(canonical(old[i])!==canonical(incoming[i]))fail('备份裁决审计与已有历史矛盾',409);
  if(incoming.length<=old.length){if(old.length)row.conditionsDecisionHistory=structuredClone(old);else delete row.conditionsDecisionHistory;clear(row);for(const k of metadata)if(prior[k]!==undefined)row[k]=prior[k];expireScoreDecision(prior,row,ctx);}
  validateDecisionHistory(row);
 }
 return next;
}
