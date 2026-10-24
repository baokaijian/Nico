import {eligiblePerformance,performanceMilliseconds,performanceLabel} from './performance.ts';
import {trainingFacts} from './training.ts';
const denied=()=>{throw Object.assign(Error('儿童查看授权已失效，请交还家长重新开启'),{status:403});};
export const nicoDay=(milliseconds=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(milliseconds));
export function childReflectionInput(data,context,input,day) {
  const view=childContext(data,context);
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['date','trainingId','mood','text','clientRequestId'].includes(key))||typeof input.clientRequestId!=='string'||!input.clientRequestId)throw Object.assign(Error('感受输入格式无效，不允许直接确认或修改训练事实'),{status:400});
  if(typeof input.date!=='string'||input.date>day)throw Object.assign(Error('感受日期不能晚于今天'),{status:400});
  if(input.trainingId&&!childProjection(data,view.id,day).trainings.some(row=>row.id===input.trainingId&&row.date===input.date))throw Object.assign(Error('请选择本页可见训练并核对日期'),{status:400});
  return {...input,viewId:view.id};
}
export function childContext(data,context) {
  const view=(data.childViews||[]).find(row=>row.id===context?.viewId);
  if(!view||view.status!=='启用'||view.version!==context?.viewVersion)denied();return view;
}
export function confirmedSkillChanges(data,start,end) {
  const confirmed=(data.skillAssessments||[]).filter(row=>row.status==='已确认');
  return confirmed.filter(row=>row.date>=start&&row.date<=end).flatMap(row=>{
    const prior=confirmed.find(item=>item.id===row.previousAssessmentId&&item.skillId===row.skillId&&item.definitionVersion===row.definitionVersion&&item.date<=row.date);
    if(!prior)return [];
    return [{id:row.id,date:row.date,name:row.standardSnapshot?.name||'技能',skillId:row.skillId,definitionVersion:row.definitionVersion,from:prior.level,to:row.level,improved:Number(row.level.slice(1))>Number(prior.level.slice(1)),sourceRefs:[{collection:'skillAssessments',id:prior.id,version:prior.version},{collection:'skillAssessments',id:row.id,version:row.version}]}];
  });
}
export function childProjection(data,viewId,day) {
  const view=(data.childViews||[]).find(row=>row.id===viewId&&row.status==='启用');if(!view)denied();
  const best=new Map();
  for(const score of data.swim||[])if(score.date<=day&&eligiblePerformance(score)){
    const key=[score.stroke,score.stroke==='打腿'?score.testItem:'',score.distance,score.poolLength].join('|');
    if(!best.has(key)||performanceMilliseconds(score)<performanceMilliseconds(best.get(key)))best.set(key,score);
  }
  const start=new Date(`${day}T00:00:00Z`);start.setUTCDate(start.getUTCDate()-90);
  const sorted=key=>[...(data[key]||[])].filter(row=>row.status==='已确认'&&row.date<=day).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  return {title:view.title,theme:view.theme,viewId:view.id,day,skills:confirmedSkillChanges(data,start.toISOString().slice(0,10),day).filter(row=>row.improved).map(({id,date,name,from,to})=>({id,date,name,from,to})),
    bests:[...best.values()].map(row=>({id:row.id,date:row.date,stroke:row.stroke,distance:row.distance,poolLength:row.poolLength,testItem:row.testItem||'',timeMs:performanceMilliseconds(row),time:performanceLabel(row)})),
    photos:view.selectedMediaIds.map(id=>(data.media||[]).find(row=>row.id===id&&['photo','image'].includes(row.type))).filter(Boolean).map(row=>({id:row.id,title:row.title,date:row.date})),
    milestones:sorted('milestones').map(({id,date,title})=>({id,date,title})),stories:sorted('growthStories').map(({id,date,title,body})=>({id,date,title,body})),
    trainings:[...(data.trainings||[])].filter(row=>row.date<=day&&trainingFacts(row).occurred).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).slice(0,30).map(row=>({id:row.id,date:row.date,title:row.session||row.trainingType||'这次训练'}))};
}
