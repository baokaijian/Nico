import { rows, recordReferences, resolveReference } from './data-quality.mjs';
import { eligiblePerformance, performanceMilliseconds, performanceLabel } from './performance.ts';
import { trainingFacts } from './training.ts';
export function growthTimeline(data, filters = {}) {
  const events = [], best = new Map();
  const add = (collection, row, title, status, extra = {}) => { const date = row.date || row.confirmedAt?.slice(0,10) || row.createdAt?.slice(0,10); if (date) events.push({ id: `${collection}/${row.id}`, collection, recordId: row.id, date, title, status: status || '未确认', stroke: row.stroke || row.standardSnapshot?.dimension || '', sourceRefs: recordReferences(collection, row), ...extra }); };
  for (const row of rows(data,'trainings')) { const fact = trainingFacts(row); add('trainings',row,row.session || row.trainingType || '训练记录',row.completionStatus || '未记录',{ detail: `实际时长${fact.minutes ?? '未记录'}分钟 · 已知实际${fact.knownMeters}米${fact.unknownSets ? ' · 含实际次数未记录组' : ''}` }); }
  for (const row of [...rows(data,'swim')].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))) {
    const key=[row.stroke,row.distance,row.poolLength,row.stroke==='打腿' ? row.testItem : ''].join('|'), ms=performanceMilliseconds(row), prior=best.get(key);
    const isPB=eligiblePerformance(row)&&prior!=null&&ms<prior;
    if(eligiblePerformance(row)&&(prior==null||ms<prior)) best.set(key,ms);
    add('swim',row,`${row.distance} ${row.stroke} · ${performanceLabel(row)}`,row.validityStatus || '未核验',{isPB,detail:`${row.poolLength || '池长未知'}${isPB?' · 有效历史PB更新':eligiblePerformance(row)&&prior==null?' · 首条有效基线':''}`});
  }
  for(const row of rows(data,'skillAssessments')) add('skillAssessments',row,`${row.standardSnapshot?.name || '技能测评'} · ${row.level}`,row.status,{detail:`标准v${row.definitionVersion} · ${row.evidenceNote || '证据未记录'}`});
  for(const row of rows(data,'goals')) add('goals',row,row.title,row.status,{detail:row.targetResult || row.targetMetric || '待补充目标结果'});
  for(const row of rows(data,'milestones').filter(r=>r.status==='已确认')) add('milestones',row,row.title,row.status,{detail:row.evidenceNote});
  for(const row of rows(data,'growthStories')) add('growthStories',row,row.title,row.status,{detail:row.body});
  for(const row of rows(data,'competitionEvents')) add('competitionEvents',row,row.name,'人工关联',{detail:row.eventType});
  for(const row of rows(data,'media')) {
    const refs=recordReferences('media',row), reverse=Object.keys(data).filter(k=>!['media','growthHistory','planHistory','trash'].includes(k)&&Array.isArray(data[k])).flatMap(k=>data[k].filter(item=>recordReferences(k,item).some(ref=>ref.collection==='media'&&ref.id===row.id)).map(item=>({collection:k,id:item.id})));
    if(!refs.some(ref=>resolveReference(data,ref))&&!reverse.length) continue;
    add('media',row,row.title,'私有授权读取',{sourceRefs:[...refs,...reverse],detail:'打开原记录读取，未改变公开范围'});
  }
  return events.filter(row=>(!filters.year||row.date.slice(0,4)===filters.year)&&(!filters.month||row.date.slice(5,7)===filters.month)&&(!filters.stroke||row.stroke===filters.stroke)&&(!filters.type||row.collection===filters.type)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
