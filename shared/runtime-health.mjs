// Closed vocabulary only. Never retain URLs, identifiers, bodies or Error objects.
export function routeCategory(value,method='GET') {
  const p=String(value).split('?')[0].replace(/^.*\/nico-api(?=\/|$)/,'');
  if(p==='/api/auth/login')return 'login';
  if(p.startsWith('/api/auth/'))return 'session';
  if(p==='/api/version'||p==='/api/health')return 'health';
  if(p==='/api/public-summary'||p.startsWith('/api/public-media/'))return 'publicRead';
  if(/^\/api\/media\/[^/]+\/content\//.test(p))return 'mediaRead';
  if(method==='POST'&&p==='/api/media')return 'upload';
  if(method==='POST'&&/^\/api\/media\/[^/]+\/variants$/.test(p))return 'processing';
  if(method==='POST'&&/^\/api\/media\/[^/]+\/processing-failure$/.test(p))return 'processingFailure';
  if(p==='/api/backup')return 'backup';if(p==='/api/restore')return 'restore';
  if(/^\/api\/(?:snapshot|swim|trainings|growth|fitness|nutrition|goals|plans|annotations|media|weakpoints|checkins|trainingTemplates|skillDefinitions|skillAssessments|milestones|growthStories|reportDrafts|competitionEvents|videoComparisons|trash|skills-overview|public-preview)(?:\/|$)/.test(p))return ['GET','HEAD'].includes(method)?'read':'write';
  return 'other';
}
export function mediaHealth(media=[]) {
  const videos=media.filter(row=>row.type==='video');
  const processed=videos.filter(row=>row.processingStatus==='已处理').length,failed=videos.filter(row=>row.processingStatus==='处理未完成，原片保留').length;
  return {originals:media.length,videos:videos.length,processed,failed,pendingOrUnknown:videos.length-processed-failed};
}
export function createHealth({now=Date.now,emit=null}={}) {
  let startedAt=now(),groups={},windowStart=startedAt,emitted=0,droppedLogs=0,pageErrors=0;
  return {
    record(path,method,status,duration) {
      const group=routeCategory(path,method),code=Number.isInteger(status)&&status>=100&&status<=599?status:0;
      const durationMs=Math.max(0,Math.min(300000,Math.round(Number(duration)||0)));
      const row=groups[group]??={requests:0,ok:0,unauthorized:0,conflict:0,invalid:0,serverError:0,networkError:0,durationMs:0,maxMs:0};
      row.requests++;row.durationMs+=durationMs;row.maxMs=Math.max(row.maxMs,durationMs);
      if(!code)row.networkError++;else if(code<400)row.ok++;else if(code===401||code===403)row.unauthorized++;else if(code===409)row.conflict++;else if(code>=500)row.serverError++;else row.invalid++;
      if(!emit)return;
      if(now()-windowStart>=10000){windowStart=now();emitted=0;}
      if(emitted<60){emitted++;try{emit({event:'nico_health_v1',group,status:code,durationMs});}catch{/* Observability must never break a save. */}}else droppedLogs++;
    },
    pageError(){pageErrors++;},
    snapshot(){return {schema:1,scope:'memory-window',startedAt,observedAt:now(),groups:structuredClone(groups),pageErrors,droppedLogs};},
    reset(){startedAt=now();groups={};windowStart=startedAt;emitted=0;droppedLogs=0;pageErrors=0;},
  };
}
