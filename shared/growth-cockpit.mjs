import {hasKnownActualDistance} from './actual-display.mjs';
import {trainingSummary} from './training.ts';
import {eligiblePerformance,performanceMilliseconds} from './performance.ts';
import {confirmedSkillChanges,nicoDay} from './child-growth.mjs';
import {diagnoseQuality} from './data-quality.mjs';
import {validDate} from './domain.mjs';
const refs=(collection,rows)=>rows.map(r=>({collection,id:r.id,...(r.version?{version:r.version}:{})}));
export function growthCockpit(data,{start,end,day=nicoDay()}){
 if(!validDate(start)||!validDate(end)||start>end||end>day)throw Error('请选择截至今天的有效起止日期');const inside=d=>typeof d==='string'&&d>=start&&d<=end;
 const trainings=(data.trainings||[]).filter(r=>inside(r.date)),groups=new Map();
 for(const r of data.swim||[])if(r.date<=end&&eligiblePerformance(r)){const key=[r.stroke,r.stroke==='打腿'?r.testItem:'',r.distance,r.poolLength].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 const bestOf=rows=>rows.reduce((a,b)=>!a||performanceMilliseconds(b)<performanceMilliseconds(a)||performanceMilliseconds(b)===performanceMilliseconds(a)&&b.date<a.date?b:a,null),bests=[];
 for(const [key,rows] of groups){const period=rows.filter(r=>inside(r.date));if(!period.length)continue;const before=rows.filter(r=>r.date<start),firstDate=period.map(r=>r.date).sort()[0];const baseline=bestOf(before.length?before:period.filter(r=>r.date===firstDate)),best=bestOf(rows),comparable=before.length>0||period.some(r=>r.date>firstDate);bests.push({key,baseline,best,periodBest:bestOf(period),periodCount:period.length,baselineOutsidePeriod:before.length>0,deltaMs:comparable?performanceMilliseconds(baseline)-performanceMilliseconds(best):null,sourceRefs:refs('swim',rows),explanation:comparable?'以阶段开始前有效PB为基线；无阶段前记录时以首个记录日最佳为基线。同项目/泳姿/打腿项目/距离/池长，正值为PB改善。出发与计时条件仍须人工核对。':'可比较日期不足两个且没有阶段前基线，同日先后未知，不推断变化。'});}
 return {start,end,training:{summary:trainingSummary(trainings),hasKnownDistance:hasKnownActualDistance(trainings),sourceRefs:refs('trainings',trainings),explanation:'仅范围内已记录的实际量；计划、取消与未完成不作实际发生。未知距离/次数不补零，真实0保留。'},bests:bests.sort((a,b)=>a.key.localeCompare(b.key)),skills:confirmedSkillChanges(data,start,end),goals:(data.goals||[]).filter(r=>r.status==='进行中'&&(!r.createdAt||r.createdAt.slice(0,10)<=end)||['已达成','已归档'].includes(r.status)&&inside(r.confirmedAt?.slice(0,10))).map(r=>({...r,sourceRefs:refs('goals',[r])})),milestones:(data.milestones||[]).filter(r=>r.status==='已确认'&&inside(r.date)).map(r=>({...r,sourceRefs:refs('milestones',[r])})),pending:diagnoseQuality(data,day).filter(i=>['DQ-SCORE-REVIEW','DQ-SKILL-REVIEW','DQ-GOAL-REVIEW','DQ-MILESTONE-REVIEW','DQ-CHILD-REVIEW'].includes(i.ruleId)),notes:['所有变化只描述已录入事实，不预测竞技表现，不计算天赋分或综合排名。','目标与待确认事项显示当前人工状态，不伪造过去状态；待办覆盖当前档案，其他事实按所选阶段筛选。','技能变化仅比较明确关联的已确认同标准版本复测；打卡数量不改变技能等级。']};
}
