const valid=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>['trainingId','mood','text','clientRequestId','baseRevision'].includes(k))&&typeof value.trainingId==='string'&&value.trainingId.length<=100&&typeof value.mood==='string'&&['','开心','平静','有点累','想再试试','不想说'].includes(value.mood)&&typeof value.text==='string'&&value.text.length<=500&&typeof value.clientRequestId==='string'&&/^[A-Za-z0-9_-]{8,120}$/.test(value.clientRequestId)&&(value.baseRevision==null||Number.isSafeInteger(value.baseRevision));
export function createChildDraft({scope,viewId,storage,isCurrent=()=>true,now=Date.now}={}) {
  try{storage??=globalThis.sessionStorage;}catch{/* Device storage is optional. */}
  const allowed=()=>scope?.role==='child'&&typeof scope.account==='string'&&scope.account&&scope.backend&&scope.expiresAt>now()&&viewId&&isCurrent(scope);
  const key=`nico.child-draft.v1:${JSON.stringify([scope?.backend,scope?.account,scope?.expiresAt,viewId])}`;
  return {read(){if(scope?.expiresAt<=now())return {status:'expired'};if(!allowed())return {status:'unavailable'};try{const raw=storage?.getItem(key);if(!raw)return {status:'empty'};const value=JSON.parse(raw);return valid(value)?{status:'ready',value}:{status:'corrupt'};}catch{return {status:'unavailable'};}},
    save(value){if(!allowed()||!valid(value))return false;try{if(!storage)return false;const existing=storage.getItem(key);if(existing&&!valid(JSON.parse(existing)))return false;storage.setItem(key,JSON.stringify(value));return true;}catch{return false;}},
    clear(){if(!allowed())return false;try{storage?.removeItem(key);return !!storage;}catch{return false;}}};
}
