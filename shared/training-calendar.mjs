import { rows } from './data-quality.mjs';
import { trainingFacts } from './training.ts';
import { performanceLabel } from './performance.ts';
const iso=date=>date.toISOString().slice(0,10);
export function calendarRange(day,mode) {
  const date=new Date(`${day}T00:00:00Z`);if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(date.getTime())||iso(date)!==day||!['week','month'].includes(mode))throw Error('日历日期或视图无效');
  const first=new Date(date),last=new Date(date);if(mode==='month'){first.setUTCDate(1);last.setUTCMonth(last.getUTCMonth()+1,0);}
  first.setUTCDate(first.getUTCDate()-((first.getUTCDay()+6)%7));last.setUTCDate(last.getUTCDate()+(6-(last.getUTCDay()+6)%7));return {start:iso(first),end:iso(last)};
}
export function calendarEntries(data,start,end) {
  const events=[],add=(collection,row,kind,label,detail='',suffix='')=>{if(row.date>=start&&row.date<=end)events.push({id:`${collection}/${row.id}${suffix}`,collection,recordId:row.id,date:row.date,kind,label,detail,status:row.status||row.completionStatus||'未确认'});};
  for(const plan of rows(data,'plans'))for(const session of plan.sessions||[])add('plans',{...session,id:plan.id,status:plan.status},session.type==='休息'?'休息':'计划',`${plan.status==='已确认'?'已确认计划':'草稿计划'} · ${session.type} · ${session.title||plan.title||''}`,`参考${session.totalMeters??'未记录'}米 · 版本${plan.version}，不计作实际完成`,`/${session.id}`);
  for(const row of rows(data,'trainings')){const facts=trainingFacts(row);add('trainings',row,'实际',row.session||row.trainingType||'训练记录',`${row.completionStatus||'完成情况未记录'} · 实际${facts.minutes??'未记录'}分钟 · ${facts.meters!=null?`实际${facts.meters}米`:facts.knownMeters>0?`已知部分${facts.knownMeters}米，总量未记录`:'实际距离未记录'}`);}
  for(const row of rows(data,'swim'))add('swim',row,row.recordType==='比赛'?'比赛成绩':'成绩测试',`${row.distance||''} ${row.stroke||''} ${performanceLabel(row)}`,`${row.poolLength||'池长未知'} · ${row.validityStatus||'未核验'}`);
  for(const row of rows(data,'skillAssessments'))add('skillAssessments',row,'技能测评',`${row.standardSnapshot?.name||'技能测评'} ${row.level}`,row.status);
  for(const row of rows(data,'competitionEvents'))add('competitionEvents',row,'赛事',row.name,row.eventType);
  return events.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
export function calendarDays(start,end) {const result=[],date=new Date(`${start}T00:00:00Z`);while(iso(date)<=end){result.push(iso(date));date.setUTCDate(date.getUTCDate()+1);}return result;}
