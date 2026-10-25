// Technical events only. Never forward exception messages, URLs or archive data.
const kinds=new Set(['backup-failed','release-failed','release-mismatch','recovered']);
const categories=new Set(['configuration','capacity','format','missing-media','source-changed','crypto','integrity','storage','network','mismatch','internal']);
export function sanitizeOperationsEvent(input={}){
 if(!kinds.has(input.kind))throw Error('Invalid operations event');
 const runId=/^(?:ci-\d{1,20}|ops-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.test(input.runId||'')?input.runId:null;
 if(!runId)throw Error('Invalid operations run identifier');
 return {schema:1,kind:input.kind,runId,category:categories.has(input.category)?input.category:'internal'};
}
export async function sendOperationsAlert(input,{webhook,allowedHosts=[],fetcher=fetch}={}){
 let event;try{event=sanitizeOperationsEvent(input);}catch{return {status:'configuration',attempts:0};}
 if(!webhook)return {status:'not-configured',attempts:0};
 let url;try{url=new URL(webhook);if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port&&url.port!=='443'||!Array.isArray(allowedHosts)||!allowedHosts.includes(url.hostname))throw Error();}catch{return {status:'configuration',attempts:0};}
 for(let attempts=1;attempts<=3;attempts++){
  try{const response=await fetcher(url.href,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':`${event.runId}:${event.kind}`},body:JSON.stringify(event),redirect:'error',signal:AbortSignal.timeout(5000)});if(response.ok)return {status:'delivered',attempts};}catch{/* No response body or exception text may enter receipts. */}
 }
 return {status:'failed',attempts:3};
}
