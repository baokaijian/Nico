import {performanceGroups,eligiblePerformance,performanceMilliseconds} from './performance.ts';
export const publicProjectUnclear=r=>r.stroke==='打腿'&&!r.testItem?.trim();
export const publicEventKey=r=>[r.distance,r.stroke,r.poolLength,...(r.stroke==='打腿'?[r.testItem?.trim()||'具体项目未公开']:[])].join('|');
export const publicEventLabel=r=>`${r.distance} ${r.stroke==='打腿'?r.testItem?.trim()||'打腿（具体项目未公开）':r.stroke} · ${r.poolLength}池`;
export function publicResults(swim=[]){
 const buckets=new Map();for(const r of swim){const key=publicEventKey(r);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(r);}
 const events=[...buckets.values()].flatMap(records=>performanceGroups(records).map(g=>({...g,key:publicEventKey(records[0]),label:publicEventLabel(records[0]),projectUnclear:publicProjectUnclear(records[0])}))).sort((a,b)=>b.records.length-a.records.length||a.key.localeCompare(b.key));
 const pbGroups=events.filter(g=>g.best&&!g.projectUnclear),best=new Map(pbGroups.map(g=>[g.key,performanceMilliseconds(g.best)]));
 const history=[...swim].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.id).localeCompare(String(b.id))).map(r=>({...r,eventKey:publicEventKey(r),projectUnclear:publicProjectUnclear(r),gapMs:eligiblePerformance(r)&&best.has(publicEventKey(r))?performanceMilliseconds(r)-best.get(publicEventKey(r)):null}));
 return {events,pbGroups,verified:history.filter(eligiblePerformance),history};
}
