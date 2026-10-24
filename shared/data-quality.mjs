import { trainingFacts } from './training.ts';
export const rows = (data, key) => data[key] || [];
export function recordReferences(key, row) {
  const refs = [], add = (collection, id) => { if (id) refs.push({ collection, id }); };
  for (const field of ['evidenceRefs', 'baselineRefs', 'completionRefs', 'sourceRefs']) for (const ref of row[field] || []) add(ref.collection, ref.id);
  if (key === 'swim') add('trainings', row.trainingId);
  if(key==='yearbooks'){add('reportDrafts',row.reportId);for(const id of row.selectedMediaIds||[])add('media',id);}
  if(key==='childViews')for(const id of row.selectedMediaIds||[])add('media',id);
  if(key==='childReflections'){add('childViews',row.viewId);add('trainings',row.trainingId);}
  if (key === 'media' || key === 'annotations') { const target = row.recordId; if (target) add('activity', target); }
  if (key === 'annotations') add('media', row.mediaId);
  if (key === 'trainings') { for (const id of row.mediaIds || []) add('media', id); add('sessions', row.plannedSessionId); add('trainingTemplates', row.templateId); add('trainings', row.copiedFromId); }
  if (key === 'skillAssessments') { add('skillDefinitions', row.skillId); add('skillAssessments', row.previousAssessmentId); add('weakpoints', row.weakPointId); for (const id of row.checkinIds || []) add('checkins', id); }
  if (key === 'goals') { for (const id of row.relatedTrainingIds || []) add('trainings', id); for (const id of row.relatedSkillIds || []) add('skillDefinitions', id); }
  if (key === 'milestones') add('goals', row.sourceGoalId);
  if (key === 'checkins') add('weakpoints', row.weakPointId);
  if (key === 'weakpoints') for (const id of String(row.sourceRef || '').split(/[,，、\s]+/).filter(Boolean)) add('any', id);
  if (key === 'plans') for (const id of row.sourceIds || []) add('any', id);
  if (key === 'competitionEvents') { for (const id of row.performanceIds || []) add('swim', id); for (const id of [...(row.mediaIds || []), ...(row.certificateIds || [])]) add('media', id); }
  if (key === 'videoComparisons') { add('media', row.leftMediaId); add('media', row.rightMediaId); add('skillDefinitions', row.skillId); add('skillAssessments', row.assessmentId); }
  return [...new Map(refs.map(ref => [`${ref.collection}/${ref.id}`, ref])).values()];
}
export function resolveReference(data, ref) {
  if (ref.collection === 'sessions') { const slash = ref.id.indexOf('/'); return rows(data, 'plans').find(row => row.id === ref.id.slice(0, slash))?.sessions?.find(row => row.id === ref.id.slice(slash + 1)); }
  const keys = ref.collection === 'activity' ? ['swim', 'trainings'] : ref.collection === 'any' ? Object.keys(data).filter(key => key !== 'trash' && key !== 'growthHistory' && key !== 'planHistory') : [ref.collection];
  return keys.flatMap(key => Array.isArray(data[key]) ? data[key] : []).find(row => row.id === ref.id && (!row.athleteId || row.athleteId === 'nico'));
}
export function diagnoseQuality(data, day) {
  const issues = [], add = (ruleId, collection, row, type, message, priority = '中', targetRef = null) => issues.push({ id: `${ruleId}/${collection}/${row.id}/${targetRef ? `${targetRef.collection}/${targetRef.id}` : ''}`, ruleId, collection, recordId: row.id, type, message, priority, targetRef });
  for (const row of rows(data, 'swim')) {
    if (!row.validityStatus || row.validityStatus === '未核验') add('DQ-SCORE-REVIEW', 'swim', row, '未核验成绩', '成绩尚未人工核验，不参与有效PB。', '高');
    if (['startType','timingMethod','recordType','poolLength'].some(key => !row[key] || ['未知','其他'].includes(row[key]))) add('DQ-SCORE-CONDITIONS', 'swim', row, '计时条件缺失', '出发、计时、记录性质或池长不明确，请按真实来源补充。');
  }
  for (const row of rows(data, 'trainings')) if (!['未完成','已取消'].includes(row.completionStatus) && (trainingFacts(row).unknownSets > 0 || row.durationMinutes == null && row.totalMeters == null)) add('DQ-TRAINING-ACTUAL', 'trainings', row, '实际信息缺失', '实际时长或距离未记录（不代表训练未完成）。');
  for (const row of rows(data, 'media')) if (!row.recordId && !rows(data, 'trainings').some(t => t.mediaIds?.includes(row.id)) && !['competitionEvents','videoComparisons','skillAssessments','milestones','growthStories'].some(key => rows(data, key).some(item => recordReferences(key, item).some(ref => ref.collection === 'media' && ref.id === row.id)))) add('DQ-MEDIA-LINK', 'media', row, '影像未关联', '素材尚未关联明确训练、成绩或成长证据。', '低');
  for (const row of rows(data, 'skillAssessments')) if (row.status === '待确认') add('DQ-SKILL-REVIEW', 'skillAssessments', row, '测评待确认', '本次人工测评仍待独立确认。', '高');
  for(const row of rows(data,'childReflections'))if(row.status==='待确认')add('DQ-CHILD-REVIEW','childReflections',row,'孩子感受待确认','请家长核对孩子的原话；确认不改变训练事实。','中');
  for (const row of rows(data, 'goals')) if (row.status === '待确认' || row.status === '进行中' && row.deadline && row.deadline < day) add('DQ-GOAL-REVIEW', 'goals', row, '目标待复盘', row.status === '待确认' ? '目标需要人工核对。' : '目标已到复盘日期；是否达成仍需人工选择证据。');
  for (const row of rows(data, 'milestones')) if (row.status === '待确认') add('DQ-MILESTONE-REVIEW', 'milestones', row, '里程碑待审核', '成长事件尚未人工审核，不能描述为正式突破。', '高');
  for (const key of Object.keys(data).filter(key => !['trash','growthHistory','planHistory'].includes(key) && Array.isArray(data[key]))) for (const row of data[key]) for (const ref of recordReferences(key, row)) if (!resolveReference(data, ref)) add('DQ-REFERENCE', key, row, '关联失效', `引用 ${ref.collection}/${ref.id} 不在当前可访问档案，可能已移入回收站；请核对原记录。`, '高', ref);
  return issues.sort((a,b) => ['高','中','低'].indexOf(a.priority) - ['高','中','低'].indexOf(b.priority) || a.id.localeCompare(b.id));
}
