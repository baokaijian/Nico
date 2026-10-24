import {diagnoseQuality} from './data-quality.mjs';
import {reportStale} from './report-drafts.mjs';
import {yearbookStale} from './yearbooks.mjs';
export const TASK_CATEGORIES=[['scores','成绩核验'],['skills','技能确认'],['child','孩子感受'],['goals','目标复盘'],['milestones','里程碑'],['reports','报告与纪念册'],['media','媒体与关联'],['data','资料待补']];
const categoryFor=issue=>issue.ruleId==='DQ-REFERENCE'||issue.collection==='media'?'media':({swim:'scores',skillAssessments:'skills',childReflections:'child',goals:'goals',milestones:'milestones',reportDrafts:'reports',yearbooks:'reports'}[issue.collection]||'data');
export function adminTasks(data,day){
 const issues=diagnoseQuality(data,day),add=(ruleId,collection,row,type,message,priority='中')=>issues.push({id:`${ruleId}/${collection}/${row.id}`,ruleId,collection,recordId:row.id,type,message,priority});
 for(const row of data.goals||[])if(row.modelVersion!==1&&!issues.some(i=>i.collection==='goals'&&i.recordId===row.id&&i.ruleId==='DQ-GOAL-REVIEW'))add('TODO-GOAL-LEGACY','goals',row,'已有目标待核对','请家长核对旧目标的起点、结果和可验证标准；原记录和历史保留，不自动认定达成。');
 for(const row of data.weakpoints||[])if(row.status==='待确认')add('TODO-POINT-REVIEW','weakpoints',row,'技术短板待核对','请在原记录核对实际观察，平台不推断技能等级。');
 for(const row of data.reportDrafts||[])if(reportStale(data,row))add('TODO-REPORT-STALE','reportDrafts',row,'报告来源过期',row.status==='已确认'?'保留原报告事实；请新建草稿并核对当前来源。':'请打开原报告，明确刷新基线并核对后再人工确认。');
 for(const row of data.yearbooks||[])if(yearbookStale(data,row))add('TODO-YEARBOOK-STALE','yearbooks',row,'纪念册来源过期','保留原纪念册和照片索引；请先核对年度报告，再新建纪念册草稿。');
 for(const row of data.media||[]){if(!row.url)add('TODO-MEDIA-SOURCE','media',row,'素材来源待核对','素材缺少可用原文件索引，请打开原记录核对；未自动重建或公开。','高');if(row.processingStatus==='处理未完成，原片保留')add('TODO-MEDIA-PROCESS','media',row,'视频处理待复验','原片仍保留，请在影像原记录检查播放或重新处理。');}
 const tasks=issues.map(issue=>{const row=data[issue.collection]?.find(r=>r.id===issue.recordId);return {...issue,taskId:issue.id,id:issue.recordId,key:issue.collection,label:issue.type,title:row?.title||row?.name||row?.standardSnapshot?.name||row?.trainingType||row?.session||`${issue.type}记录`,date:row?.date||row?.deadline||row?.updatedAt?.slice(0,10)||'',category:categoryFor(issue),source:{collection:issue.collection,id:issue.recordId}};});
 return selectAdminTasks([...new Map(tasks.map(t=>[t.taskId,t])).values()]);
}
export function selectAdminTasks(tasks,{category='',sort='priority'}={}){const rank={'高':0,'中':1,'低':2};return tasks.filter(t=>!category||t.category===category).sort((a,b)=>sort==='date'?(b.date||'').localeCompare(a.date||'')||a.taskId.localeCompare(b.taskId):((rank[a.priority]??1)-(rank[b.priority]??1))*(sort==='priority-asc'?-1:1)||a.taskId.localeCompare(b.taskId));}
