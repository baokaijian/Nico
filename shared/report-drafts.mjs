import { trainingSummary } from './training.ts';
import { growthTimeline } from './growth-timeline.mjs';
import { rows, recordReferences, resolveReference } from './data-quality.mjs';
import { performanceLabel } from './performance.ts';
const canonical = value => JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
const fail = message => { throw Object.assign(Error(message),{status:400}); };
export function reportRange(type, period) {
  if(typeof period!=='string'||!['month','year'].includes(type)||!(type==='month'?/^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/:/^(?:19|20|21)\d{2}$/).test(period)) fail('请选择有效的月度或年度周期（1900–2199）');
  const start=type==='month'?`${period}-01`:`${period}-01-01`, year=Number(period.slice(0,4)), month=type==='month'?Number(period.slice(5)):12;
  const end=`${year}-${String(month).padStart(2,'0')}-${new Date(Date.UTC(year,month,0)).getUTCDate()}`;
  return {start,end};
}
export function buildReportFacts(data, report) {
  const {start,end}=reportRange(report.periodType,report.period), inRange=date=>typeof date==='string'&&date>=start&&date<=end, source=new Map();
  const add=(key,row)=>{if(row)source.set(`${key}/${row.id}`,{collection:key,id:row.id,record:structuredClone(row)});};
  const select=(key,predicate)=>rows(data,key).filter(predicate).map(row=>{add(key,row);return row;});
  const trainings=select('trainings',row=>inRange(row.date)), scores=select('swim',row=>row.date<=end), assessments=select('skillAssessments',row=>row.date<=end);
  const goals=select('goals',row=>inRange(row.deadline)||inRange(row.confirmedAt?.slice(0,10))||inRange(row.createdAt?.slice(0,10)));
  const milestones=select('milestones',row=>inRange(row.date));
  const competitions=select('competitionEvents',row=>inRange(row.date));
  const media=(report.selectedMediaIds||[]).map(id=>{const item=rows(data,'media').find(row=>row.id===id);if(!item||!inRange(item.date))fail('精选影像须为本报告周期内当前可访问的真实素材');add('media',item);return item;});
  // Relevant evidence affects the baseline too. No report/story/history traversals or remote fetching.
  for(const item of source.values()) for(const ref of recordReferences(item.collection,item.record)) {
    if(['swim','trainings','media','annotations','skillDefinitions','skillAssessments','goals','milestones','weakpoints','checkins','trainingTemplates','plans'].includes(ref.collection))add(ref.collection,resolveReference(data,ref));
  }
  const ordered=assessments.filter(row=>row.status==='已确认').sort((a,b)=>a.date.localeCompare(b.date)||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||a.id.localeCompare(b.id));
  const changes=ordered.filter(row=>inRange(row.date)).map(row=>{
    const peers=ordered.filter(p=>p.id!==row.id&&p.skillId===row.skillId&&p.definitionVersion===row.definitionVersion&&p.date<=row.date);
    // A date has no intra-day measurement order. Random IDs and entry times are not evidence.
    const explicit=peers.find(p=>p.id===row.previousAssessmentId),earlier=peers.filter(p=>p.date<row.date),lastDay=earlier.at(-1)?.date;
    const lastCandidates=earlier.filter(p=>p.date===lastDay),terminals=lastCandidates.filter(p=>!lastCandidates.some(other=>other.previousAssessmentId===p.id));
    const prior=explicit||(terminals.length===1?terminals[0]:null);
    return {id:row.id,date:row.date,name:row.standardSnapshot?.name||'技能测评',level:row.level,previousLevel:prior?.level||'无明确顺序的同版本已确认基线',definitionVersion:row.definitionVersion};
  });
  const timeline=growthTimeline({...data,swim:scores,media:[],competitionEvents:[]});
  const facts={ training:trainingSummary(trainings), scores:scores.filter(row=>inRange(row.date)).map(row=>({id:row.id,date:row.date,stroke:row.stroke,distance:row.distance,poolLength:row.poolLength,time:performanceLabel(row),validityStatus:row.validityStatus||'未核验'})),
    pbEvents:timeline.filter(row=>row.collection==='swim'&&row.isPB&&inRange(row.date)).map(row=>({id:row.recordId,date:row.date,title:row.title,detail:row.detail})), skills:changes,pendingAssessments:assessments.filter(row=>inRange(row.date)&&row.status==='待确认').length,
    goals:goals.map(row=>({id:row.id,title:row.title,status:row.status,confirmedInPeriod:['已达成','已归档'].includes(row.status)&&inRange(row.confirmedAt?.slice(0,10))})),milestones:milestones.filter(row=>row.status==='已确认').map(row=>({id:row.id,date:row.date,title:row.title})),pendingMilestones:milestones.filter(row=>row.status!=='已确认').length,
    competitions:competitions.map(row=>({id:row.id,date:row.date,name:row.name,awards:row.awards||''})),media:media.map(row=>({id:row.id,title:row.title,date:row.date})) };
  const sources=[...source.values()].sort((a,b)=>`${a.collection}/${a.id}`.localeCompare(`${b.collection}/${b.id}`));
  return {start,end,facts,baseline:canonical({engine:'nico-report-1',start,end,sources}),sourceRefs:sources.map(({collection,id,record})=>({collection,id,...(record.version?{version:record.version}:{})}))};
}
export function reportStale(data,report) { try{return report.baseline!==buildReportFacts(data,report).baseline;}catch{return true;} }
export function validateReportSnapshot(report) {
  let source;
  try { source=JSON.parse(report.baseline); } catch { fail('报告来源基线格式无效'); }
  if(source?.engine!=='nico-report-1'||!Array.isArray(source.sources)||typeof report.generatedAt!=='string'||!Number.isFinite(Date.parse(report.generatedAt))||!['待确认','已确认'].includes(report.status))fail('报告快照或生成元数据无效');
  const data={};for(const item of source.sources){if(!item||typeof item.collection!=='string'||!item.record||item.id!==item.record.id)fail('报告来源格式无效');(data[item.collection]||=[]).push(item.record);}
  const expected=buildReportFacts(data,report);
  if(report.start!==expected.start||report.end!==expected.end||canonical(report.facts)!==canonical(expected.facts)||canonical(report.sourceRefs)!==canonical(expected.sourceRefs)||report.baseline!==expected.baseline)fail('报告事实与保存的来源基线不一致');
}
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function growthReportHTML(report, stale=false) {
  const f=report.facts, list=(items,format)=>items.length?`<ul>${items.map(row=>`<li>${escape(format(row))}</li>`).join('')}</ul>`:'<p>此周期暂无适用记录，数据不足，不作推断。</p>';
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'"><title>${escape(report.title)}</title><style>body{font:16px/1.7 system-ui;max-width:850px;margin:32px auto;padding:16px;color:#142a32}h1,h2{line-height:1.3}p,li{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#52656d}@media print{body{margin:0}h2{break-after:avoid}}</style><h1>${escape(report.title)}</h1><p>私有${report.periodType==='year'?'年度':'月度'}成长报告 · ${escape(report.start)}—${escape(report.end)}</p><p>生成时间${escape(report.generatedAt)} · ${escape(report.status)} · v${escape(report.version)}${stale?' · 来源基线已过期，当前展示保留的生成时事实':''}</p><p>按发生日期选取，核验状态以生成时为准。未确认信息不是正式突破。</p><h2>训练实际情况</h2><p>已知实际训练${f.training.count}次；${f.training.records}条记录；${f.training.metersCount===0&&f.training.knownMeters===0?'实际距离未记录':`已知实际距离${f.training.knownMeters}米`}（${f.training.metersCount}条填写）；时长${f.training.minutes??'未记录'}分钟（${f.training.minutesCount}条填写）；${f.training.unknownSets}组实际次数未知。计划量不计入实际。</p><h2>成绩与有效PB</h2>${list(f.scores,r=>`${r.date} ${r.distance} ${r.stroke} ${r.poolLength} ${r.time} · ${r.validityStatus} [${r.id}]`)}<h3>有效历史PB更新</h3>${list(f.pbEvents,r=>`${r.date} ${r.title} ${r.detail} [${r.id}]`)}<h2>技能等级变化</h2>${list(f.skills,r=>`${r.date} ${r.name} 标准v${r.definitionVersion}：${r.previousLevel} → ${r.level} [${r.id}]`)}<p>另有${f.pendingAssessments}条测评待人工确认；不同版本标准不直接推导提升。</p><h2>阶段目标</h2>${list(f.goals,r=>`${r.title} · ${r.status}${r.confirmedInPeriod?' · 本周期已人工确认达成':''} [${r.id}]`)}<h2>比赛和里程碑</h2>${list(f.competitions,r=>`${r.date} ${r.name} ${r.awards} [${r.id}]`)}${list(f.milestones,r=>`${r.date} ${r.title} [${r.id}]`)}<p>另有${f.pendingMilestones}项成长事件尚未确认。</p><h2>精选影像</h2>${list(f.media,r=>`${r.date} ${r.title} [${r.id}]（私有素材请登录档案查看）`)}<h2>家长总结</h2><p>${escape(report.parentSummary||'未填写')}</p><h2>孩子的个人感受</h2><p>${escape(report.childFeeling||'未记录，不代替孩子发言')}</p><h2>下阶段观察重点</h2><p>${escape(report.nextFocus||'未填写')}</p><h2>确认与来源</h2><p>确认人${escape(report.confirmedBy||'尚未确认')} · ${escape(report.confirmationNote||'')} · 账号${escape(report.confirmedActor||report.createdBy)} · ${escape(report.confirmedAt||'')}</p>${list(report.sourceRefs,r=>`${r.collection}/${r.id}${r.version?` v${r.version}`:''}`)}</html>`;
}
