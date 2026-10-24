import {adminTasks} from './admin-tasks.mjs';
import {trainingFacts} from './training.ts';
export const SETUP_STEPS=['scores','skills','training','goals','media'];
export function growthSetup(data,day){
 const tasks=adminTasks(data,day),scores=data.swim||[],standards=(data.skillDefinitions||[]).filter(s=>s.status==='启用'),assessments=data.skillAssessments||[],baselines=standards.filter(s=>assessments.some(a=>a.skillId===s.id&&a.definitionVersion===s.version&&a.status==='已确认'&&a.date<=day)),trainings=(data.trainings||[]).filter(t=>t.date<=day&&trainingFacts(t).occurred),goals=data.goals||[],media=data.media||[];
 const scoreTasks=tasks.filter(t=>t.collection==='swim'&&t.category==='scores'),goalTasks=tasks.filter(t=>t.category==='goals'),mediaTasks=tasks.filter(t=>t.collection==='media'&&t.category==='media');
 const recordIds=items=>[...new Set(items.map(t=>t.recordId))];
 const steps=[
 {id:'scores',title:'核对历史成绩',status:!scores.length?'empty':scoreTasks.length?'needs-action':'ready',summary:!scores.length?'尚无已录入成绩，可稍后再核对。':`${scores.length}条真实成绩，${recordIds(scoreTasks).length}条待核验或补充计时条件。`,records:recordIds(scoreTasks).map(id=>({collection:'swim',id})),guidance:'按原始计时依据逐条核对。失格、无效和未核验继续保留；不自动改为有效。'},
 {id:'skills',title:'配置标准，记录真实基线',status:standards.length&&baselines.length===standards.length?'ready':'needs-action',summary:`${standards.length}项已启用标准，${baselines.length}项当前版本已有人工确认的基线测评。`,records:standards.map(s=>({collection:'skillDefinitions',id:s.id})),guidance:'先按实际观察审核标准，再录入真实测评并独立确认；不从成绩或打卡推算等级。'},
 {id:'training',title:'记录一次实际训练',status:trainings.length?'ready':'empty',summary:trainings.length?`已有${trainings.length}次填写了实际发生依据的训练。`:'尚无已录入的实际训练，不代表没有训练。',records:trainings.slice(-3).map(t=>({collection:'trainings',id:t.id})),guidance:'只填写实际发生的日期、内容、时长或距离和完成情况，计划量不会代填实际量。'},
 {id:'goals',title:'核对已有目标',status:!goals.length?'empty':goalTasks.length?'needs-action':'ready',summary:goals.length?`${goals.length}个已有目标，${recordIds(goalTasks).length}个待核对或复盘。`:'尚无目标，可按实际需要稍后建立。',records:goals.map(g=>({collection:'goals',id:g.id})),guidance:'旧目标可在原记录补充起点、结果与可验证标准；已整理不等于已达成，达成证据和里程碑仍需独立确认。'},
 {id:'media',title:'检查影像关联',status:!media.length?'empty':mediaTasks.length?'needs-action':'ready',summary:media.length?`${media.length}项影像，${recordIds(mediaTasks).length}项关联、来源或处理状态待检查。`:'尚无已录入影像，可稍后添加真实素材。',records:media.map(m=>({collection:'media',id:m.id})),guidance:'关联真实成绩、训练或成长证据。关系已整理不代表视频已经实际播放或转码验收。'},
 ];return {steps,readyCount:steps.filter(s=>s.status==='ready').length,total:steps.length};
}
