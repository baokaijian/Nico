import {hasKnownActualDistance,actualDistanceText} from './actual-display.mjs';
import { reportStale,validateReportSnapshot } from './report-drafts.mjs';
export const YEARBOOK_SECTIONS=['training','scores','skills','competitions','milestones','media','messages'];
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const fail=message=>{throw Object.assign(Error(message),{status:400});};
export function freezeYearbook(data,book){
 const report=data.reportDrafts?.find(r=>r.id===book.reportId);if(!report||report.periodType!=='year'||report.period!==book.year||report.status!=='已确认')fail('请选择同年度已人工确认的年度报告');if(reportStale(data,report))fail('年度报告来源已过期，请先生成并确认新的报告');
 const mediaSnapshots=book.selectedMediaIds.map(id=>{const m=data.media?.find(r=>r.id===id);if(!m||m.date?.slice(0,4)!==book.year)fail('精选素材须为同年度当前可访问的真实影像');return structuredClone(m);});
 return {reportVersion:report.version,reportSnapshot:structuredClone(report),mediaSnapshots};
}
export function yearbookStale(data,b){const r=data.reportDrafts?.find(r=>r.id===b.reportId);return !r||r.version!==b.reportVersion||canonical(r)!==canonical(b.reportSnapshot)||reportStale(data,b.reportSnapshot)||(b.mediaSnapshots||[]).some(m=>canonical(data.media?.find(r=>r.id===m.id))!==canonical(m));}
export function validateYearbookSnapshot(b){if(b.reportSnapshot?.id!==b.reportId||b.reportSnapshot?.version!==b.reportVersion||b.reportSnapshot?.periodType!=='year'||b.reportSnapshot?.period!==b.year||b.reportSnapshot?.status!=='已确认')fail('纪念册年度报告快照不一致');validateReportSnapshot(b.reportSnapshot);if(!Array.isArray(b.mediaSnapshots)||b.mediaSnapshots.length!==b.selectedMediaIds.length||b.mediaSnapshots.some((m,i)=>m?.id!==b.selectedMediaIds[i]||m.date?.slice(0,4)!==b.year))fail('纪念册精选影像快照不一致');}
export function yearbookSections(b){
 const f=b.reportSnapshot.facts,t=f.training;let trainingSources=[];try{trainingSources=JSON.parse(b.reportSnapshot.baseline).sources.filter(s=>s.collection==='trainings'&&s.record.date>=b.reportSnapshot.start&&s.record.date<=b.reportSnapshot.end).map(s=>s.record);}catch{/* Old presentation fallback uses stored counts without mutating facts. */}const empty='此年度暂无适用记录，数据不足，不作推断。';
 const list=(items,format)=>items.length?items.map(format):[empty];
 const content={
 training:{title:'我在水里度过的时光',lines:[`实际发生${t.count}次 / ${t.records}条记录；已知时长${t.minutes??'未记录'}分钟。`,actualDistanceText(t,hasKnownActualDistance(trainingSources)),'计划量不作实际完成量，缺失不代表没有训练。']},
 scores:{title:'属于我的成绩',lines:[...list(f.scores,r=>`${r.date} · ${r.distance} ${r.stroke} / ${r.poolLength} · ${r.time} · ${r.validityStatus} [swim/${r.id}]`),'已核验有效的历史PB更新：',...list(f.pbEvents,r=>`${r.date} · ${r.title} · ${r.detail} [swim/${r.id}]`)]},
 skills:{title:'慢慢学会的本领',lines:list(f.skills,r=>`${r.date} · ${r.name}：${r.previousLevel} → ${r.level} · 标准v${r.definitionVersion} [skillAssessments/${r.id}]`)},
 competitions:{title:'比赛中的经历',lines:list(f.competitions,r=>`${r.date} · ${r.name} ${r.awards||''} [competitionEvents/${r.id}]`)},
 milestones:{title:'值得记住的一步',lines:list(f.milestones,r=>`${r.date} · ${r.title} [milestones/${r.id}]`)},
 media:{title:'留住这些瞬间',lines:list(b.mediaSnapshots,r=>`${r.date} · ${r.title} [media/${r.id}]${r.type==='video'?'（私有视频索引，登录原档案查看）':''}`)},
 messages:{title:'写给这一年的话',lines:['家长寄语',b.parentMessage||'尚未填写','孩子的成长感言',b.childMessage||'未记录，不代替孩子发言','下一阶段观察重点',b.reportSnapshot.nextFocus||'尚未填写']},
 };
 return b.sectionOrder.map(key=>({key,...content[key]}));
}
