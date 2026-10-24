import { buildReportFacts, reportStale, validateReportSnapshot } from './report-drafts.mjs';
import { GROWTH_COLLECTIONS, growthCollection, validateGrowthInput, validateStoredGrowth, evidenceRefs, growthText, objectRecord, SKILL_LEVELS, failGrowth } from './growth-model.ts';
import { eligiblePerformance } from './performance.ts';
const records = (data, key) => data[key] || [];
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const lookup = (data, key, id, archived = false) => records(data, key).find(row => row.id === id) || (archived ? data.trash?.find(item => item.collection === key && item.record.id === id)?.record : null);
function related(data, key, id, archived = false) {
  const row = lookup(data, key, id, archived); if (!row || row.athleteId && row.athleteId !== 'nico') failGrowth('关联记录不存在、已删除或不属于当前档案'); return row;
}
function snapshots(data, refs, oldRefs = [], oldSnapshots = [], { completed = false, selfId } = {}) {
  return refs.map(ref => {
    if (ref.id === selfId) failGrowth('不能引用自身作为证据');
    const old = oldRefs.findIndex(item => item.collection === ref.collection && item.id === ref.id);
    const row = related(data, ref.collection, ref.id, old >= 0);
    if (completed && ref.collection === 'skillAssessments' && row.status !== '已确认') failGrowth('目标技能证据须为已确认测评');
    if (completed && ref.collection === 'swim' && !eligiblePerformance(row)) failGrowth('目标成绩证据须先核验为有效成绩且池长明确');
    if (old >= 0 && oldSnapshots[old]) return structuredClone(oldSnapshots[old]);
    const keys = ['date', 'title', 'name', 'session', 'dimension', 'version', 'skillId', 'definitionVersion', 'level', 'status', 'distance', 'stroke', 'poolLength', 'timeMs', 'validityStatus', 'totalMeters', 'durationMinutes', 'completionStatus', 'weakPointId', 'times', 'quality', 'observation', 'startSecond', 'endSecond', 'evidenceNote'];
    return { ...ref, ...Object.fromEntries(keys.filter(key => row[key] !== undefined).map(key => [key, structuredClone(row[key])])) };
  });
}
export function validateGrowthRelations(data, key, record, previous = null) {
  if(key==='childViews')for(const id of record.selectedMediaIds)if(!['photo','image'].includes(related(data,'media',id,previous?.selectedMediaIds?.includes(id)).type))failGrowth('儿童页只能选择照片');
  if(key==='childReflections'){related(data,'childViews',record.viewId,previous?.viewId===record.viewId);if(record.trainingId)related(data,'trainings',record.trainingId,previous?.trainingId===record.trainingId);}
  if (key === 'videoComparisons') {
    for (const side of ['left','right']) {
      const media = related(data,'media',record[`${side}MediaId`],previous?.[`${side}MediaId`] === record[`${side}MediaId`]);
      if (media.type !== 'video') failGrowth('A/B对比只能选择真实视频');
      if (media.duration != null && record[`${side}Second`] >= media.duration) failGrowth('对比时间点须小于视频时长');
    }
    if (record.skillId) {
      const skill = related(data,'skillDefinitions',record.skillId,previous?.skillId === record.skillId);
      record.skillVersion = previous?.skillId === record.skillId ? previous.skillVersion : skill.version;
    } else if (record.assessmentId) failGrowth('关联测评前请选择对应技能标准');
    if (record.assessmentId) {
      const assessment = related(data,'skillAssessments',record.assessmentId,previous?.assessmentId === record.assessmentId);
      if (assessment.skillId !== record.skillId) failGrowth('测评与技能标准不一致');
      record.assessmentVersion = previous?.assessmentId === record.assessmentId ? previous.assessmentVersion : assessment.version;
    }
    if (!record.skillId) delete record.skillVersion;
    if (!record.assessmentId) delete record.assessmentVersion;
  }
  if (key === 'competitionEvents') {
    for (const id of record.performanceIds) {
      const score = related(data, 'swim', id, previous?.performanceIds?.includes(id));
      if (!previous?.performanceIds?.includes(id) || previous.date !== record.date || previous.poolLength !== record.poolLength) {
        if (score.recordType !== '比赛' || score.date !== record.date || score.poolLength !== record.poolLength) failGrowth('关联成绩须为同日、同池长的比赛记录，请先核对真实来源');
      }
      if (records(data, key).some(item => item.id !== record.id && item.performanceIds.includes(id))) failGrowth('此成绩已属于另一赛事，请先核对或解除原关联', 409);
    }
    for (const id of record.mediaIds) related(data, 'media', id, previous?.mediaIds?.includes(id));
    for (const id of record.certificateIds) if (related(data, 'media', id, previous?.certificateIds?.includes(id)).type !== 'image') failGrowth('证书请关联真实照片，不能把视频当作证书');
  }
  if (key === 'skillAssessments') {
    if (previous?.skillId === record.skillId) {
      if (record.definitionVersion !== previous.definitionVersion) failGrowth('既有评估的标准版本不可替换；请新建复测', 409);
      record.standardSnapshot = structuredClone(previous.standardSnapshot);
    } else {
      const definition = related(data, 'skillDefinitions', record.skillId);
      if (definition.status !== '启用' || definition.version !== record.definitionVersion) failGrowth('标准未启用或版本已改变，请重新选择', 409);
      record.standardSnapshot = structuredClone(definition);
    }
    if (record.previousAssessmentId) {
      const prior = related(data, 'skillAssessments', record.previousAssessmentId, previous?.previousAssessmentId === record.previousAssessmentId);
      if (prior.skillId !== record.skillId || prior.id === record.id || prior.date > record.date || prior.status !== '已确认') failGrowth('复测须关联同技能、日期不晚于本次的已确认评估');
    }
    if (record.weakPointId) {
      const point = related(data, 'weakpoints', record.weakPointId, previous?.weakPointId === record.weakPointId);
      if (record.previousAssessmentId && !String(point.sourceRef || '').split(/[,，、\s]+/).includes(record.previousAssessmentId)) failGrowth('技术短板来源与本次前评估不一致');
    }
    if (record.checkinIds.length && !record.weakPointId) failGrowth('关联打卡须先选择技术短板');
    for (const id of record.checkinIds) if (related(data, 'checkins', id, previous?.checkinIds?.includes(id)).weakPointId !== record.weakPointId) failGrowth('打卡不属于本次技术短板');
    record.evidenceSnapshots = snapshots(data, record.evidenceRefs, previous?.evidenceRefs, previous?.evidenceSnapshots, { selfId: record.id });
  }
  if (key === 'goals') {
    record.baselineSnapshots = snapshots(data, record.baselineRefs, previous?.baselineRefs, previous?.baselineSnapshots, { selfId: record.id });
    record.relatedSkillSnapshots = record.relatedSkillIds.map(id => {
      const definition = related(data, 'skillDefinitions', id, previous?.relatedSkillIds?.includes(id));
      return structuredClone(previous?.relatedSkillSnapshots?.find(item => item.id === id) || definition);
    });
    for (const id of record.relatedTrainingIds) related(data, 'trainings', id, previous?.relatedTrainingIds?.includes(id));
  }
  if (['milestones', 'growthStories'].includes(key)) record.evidenceSnapshots = snapshots(data, record.evidenceRefs, previous?.evidenceRefs, previous?.evidenceSnapshots, { selfId: record.id });
}
function historyVersion(data, key, id) {
  return Math.max(0, ...records(data, 'growthHistory').filter(item => item.collection === key && item.recordId === id).map(item => item.version), Number(lookup(data, key, id, true)?.version) || 0);
}
function appendHistory(data, key, record, operation, actor, now, version = record.version) {
  data.growthHistory ||= [];
  const item = { collection: key, recordId: record.id, version, operation, at: now, by: actor, record: structuredClone(record) };
  const prior = data.growthHistory.find(row => row.collection === key && row.recordId === record.id && row.version === version);
  if (prior && canonical(prior) !== canonical(item)) failGrowth('同版本成长历史发生冲突，禁止覆盖', 409);
  if (!prior) data.growthHistory.push(item);
}
function finish(data, key, record, previous, operation, actor, now, request = null) {
  if (previous && !growthCollection(key, previous) && !records(data, 'growthHistory').some(row => row.collection === key && row.recordId === record.id)) appendHistory(data, key, previous, 'legacy', actor, now, 0);
  Object.assign(record, { modelVersion: 1, athleteId: 'nico', version: historyVersion(data, key, record.id) + 1, updatedAt: now, updatedBy: actor });
  if (!previous) Object.assign(record, { createdAt: now, createdBy: actor, ...(request ? { creationRequest: request } : {}) });
  validateStoredGrowth(key, record); appendHistory(data, key, record, operation, actor, now); return record;
}
export function saveGrowth(data, key, input, { id, actor, now, request = null }) {
  const previous = records(data, key).find(row => row.id === id) || null;
  const record = { ...validateGrowthInput(key, input, previous), id };
  validateGrowthRelations(data, key, record, previous);
  if (key === 'reportDrafts') {
    if (previous && (previous.period !== record.period || previous.periodType !== record.periodType || canonical(previous.selectedMediaIds) !== canonical(record.selectedMediaIds))) failGrowth('已保存报告的来源范围不可直接更换，请新建草稿', 409);
    if (!previous) Object.assign(record, buildReportFacts(data, record), { generatedAt: now, status: '待确认' });
  }
  finish(data, key, record, previous, previous ? 'update' : 'create', actor, now, request);
  if (previous) data[key][data[key].findIndex(row => row.id === id)] = record; else data[key].push(record);
  return record;
}
const confirmation = input => {
  const raw = objectRecord(input); if (Object.keys(raw).some(key => !['confirmedBy', 'note', 'evidenceRefs'].includes(key))) failGrowth('确认操作包含不支持的字段');
  return { confirmedBy: growthText(raw.confirmedBy, '人工确认人', true, 100), confirmationNote: growthText(raw.note, '人工确认说明', true), refs: evidenceRefs(raw.evidenceRefs) };
};
const actionNote = input => {
  const raw = objectRecord(input);
  if (Object.keys(raw).some(key => key !== 'note')) failGrowth('操作包含不支持的字段');
  return growthText(raw.note, '操作原因', true);
};
export function actGrowth(data, key, id, action, input, { actor, now }) {
  const previous = related(data, key, id), record = structuredClone(previous);
  if (!growthCollection(key, previous)) failGrowth('请先补充基线、结果和标准，明确采用新版目标流程');
  if (action === 'confirm' && ['skillAssessments', 'goals', 'milestones', 'growthStories', 'reportDrafts','childReflections'].includes(key)) {
    const proof = confirmation(input), done = key === 'goals' ? '已达成' : '已确认';
    if (record.status === done || key === 'goals' && record.status === '已归档') {
      if (record.confirmedBy !== proof.confirmedBy || record.confirmationNote !== proof.confirmationNote || key === 'goals' && canonical(record.completionRefs) !== canonical(proof.refs)) failGrowth('原确认信息不同，请核对已有记录', 409);
      return previous;
    }
    if (record.status !== '待确认' && !(key === 'goals' && record.status === '进行中')) failGrowth('当前状态不能确认，请先核对或重新开启', 409);
    if (key === 'reportDrafts' && reportStale(data, record)) failGrowth('报告来源基线已过期，请明确重新生成并核对', 409);
    if (key === 'goals') {
      if (!proof.refs.length) failGrowth('请关联至少一条可验证达成证据');
      record.completionRefs = proof.refs; record.completionSnapshots = snapshots(data, proof.refs, [], [], { completed: true, selfId: id });
    } else if (proof.refs.length) failGrowth('评估和里程碑使用本记录的证据，请先保存证据再确认');
    Object.assign(record, { status: done, confirmedAt: now, confirmedBy: proof.confirmedBy, confirmedActor: actor, confirmationNote: proof.confirmationNote });
  } else if (action === 'refresh' && key === 'reportDrafts') {
    actionNote(input);
    if (record.status !== '待确认') failGrowth('已确认报告保留原事实；请新建同周期草稿', 409);
    Object.assign(record, buildReportFacts(data, record), { generatedAt: now });
  } else if (action === 'archive' && key === 'goals') {
    if (Object.keys(objectRecord(input)).length) failGrowth('归档操作不接受额外字段');
    if (record.status === '已归档') return previous;
    if (record.status !== '已达成') failGrowth('仅人工确认达成的目标可完成归档', 409);
    Object.assign(record, { status: '已归档', archivedAt: now, archivedBy: actor });
  } else if (action === 'reopen' && key === 'goals') {
    const note = actionNote(input);
    if (!['已达成', '已归档', '暂停'].includes(record.status)) failGrowth('当前目标无需重新开启', 409);
    Object.assign(record, { status: '进行中', reopenNote: note });
    for (const field of ['confirmedAt', 'confirmedBy', 'confirmedActor', 'confirmationNote', 'completionRefs', 'completionSnapshots', 'archivedAt', 'archivedBy']) delete record[field];
  } else if (action === 'withdraw' && key === 'skillAssessments') {
    if (record.status !== '已确认') failGrowth('仅已确认评估可撤销', 409);
    Object.assign(record, { status: '已撤销', withdrawnAt: now, withdrawnBy: actor, withdrawalNote: actionNote(input) });
  } else failGrowth('不支持的成长操作', 404);
  finish(data, key, record, previous, action, actor, now); data[key][data[key].findIndex(row => row.id === id)] = record;
  if (key === 'goals' && action === 'confirm' && ![...records(data, 'milestones'), ...(data.trash || []).filter(item => item.collection === 'milestones').map(item => item.record)].some(item => item.sourceGoalId === id && item.sourceGoalVersion === record.version)) {
    const candidate = { ...validateGrowthInput('milestones', { title: `达成目标：${record.title}`, date: now.slice(0, 10), status: '待确认', evidenceNote: record.confirmationNote, evidenceRefs: record.completionRefs, notes: '由目标的人工完成确认生成，待家长再次确认成长事件。' }), id: `milestone-${crypto.randomUUID()}`, origin: 'goal', sourceGoalId: id, sourceGoalVersion: record.version, sourceGoalSnapshot: structuredClone(record), evidenceSnapshots: structuredClone(record.completionSnapshots) };
    finish(data, 'milestones', candidate, null, 'candidate', actor, now); data.milestones.push(candidate);
  }
  return record;
}
export function deleteGrowth(data, key, record, { actor, now }) {
  return finish(data, key, { ...record }, record, 'delete', actor, now);
}
export function restoreGrowth(data, key, record, { actor, now }) {
  if (key === 'competitionEvents' && records(data, key).some(item => item.id !== record.id && item.performanceIds.some(id => record.performanceIds.includes(id)))) failGrowth('原赛事成绩已关联另一有效赛事；请先核对并解除冲突，回收记录仍保留', 409);
  return finish(data, key, { ...record }, record, 'restore', actor, now);
}
export function goalCandidates(data, goal) {
  const result = [];
  for (const assessment of records(data, 'skillAssessments')) {
    const standard = goal.relatedSkillSnapshots?.find(item => item.id === assessment.skillId);
    if (goal.relatedSkillIds?.includes(assessment.skillId) && assessment.status === '已确认' && (!standard || standard.version === assessment.definitionVersion) && (!goal.targetSkillLevel || SKILL_LEVELS.indexOf(assessment.level) >= SKILL_LEVELS.indexOf(goal.targetSkillLevel))) result.push({ collection: 'skillAssessments', id: assessment.id, label: `${assessment.date} · ${assessment.standardSnapshot.name} · ${assessment.level}`, reason: '同标准版本的已确认测评，仍需人工对照全部达成标准' });
  }
  for (const training of records(data, 'trainings').filter(row => goal.relatedTrainingIds?.includes(row.id))) result.push({ collection: 'trainings', id: training.id, label: `${training.date} · ${training.session || '训练'}`, reason: '人工关联的训练记录，不代表目标自动达成' });
  for (const swim of records(data, 'swim').filter(row => eligiblePerformance(row))) {
    if (goal.baselineSnapshots?.some(base => base.collection === 'swim' && base.distance === swim.distance && base.stroke === swim.stroke && base.poolLength === swim.poolLength && swim.date >= base.date)) result.push({ collection: 'swim', id: swim.id, label: `${swim.date} · ${swim.distance}${swim.stroke}`, reason: '与基线同项目池长的有效成绩，目标结果须人工核对' });
  }
  return result;
}
export function validateGrowthHistory(data) {
  const all = GROWTH_COLLECTIONS.flatMap(key => records(data, key).map(record => ({ key, record }))).concat((data.trash || []).filter(item => growthCollection(item.collection, item.record)).map(item => ({ key: item.collection, record: item.record }))).filter(item => growthCollection(item.key, item.record));
  if (data.growthHistory === undefined) { if (all.length) failGrowth('成长记录缺少服务端版本历史'); return; }
  if (!Array.isArray(data.growthHistory)) failGrowth('成长历史格式无效');
  const seen = new Set();
  for (const item of data.growthHistory) {
    if (!item || !growthCollection(item.collection) || !Number.isSafeInteger(item.version) || item.version < 0 || typeof item.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(item.at) || !Number.isFinite(Date.parse(item.at)) || typeof item.by !== 'string' || !item.by || item.recordId !== item.record?.id || !['legacy', 'create', 'update', 'confirm', 'withdraw', 'archive', 'reopen', 'delete', 'restore', 'backup-restore', 'candidate', 'refresh'].includes(item.operation) || item.version > 0 && item.version !== item.record.version) failGrowth('成长历史条目无效');
    const key = `${item.collection}/${item.recordId}/${item.version}`; if (seen.has(key)) failGrowth('成长历史版本重复'); seen.add(key);
    if (item.version > 0) { validateStoredGrowth(item.collection, item.record); if (item.collection === 'reportDrafts') validateReportSnapshot(item.record); }
  }
  const sameVersion = (key, record) => data.growthHistory.some(item => item.collection === key && item.recordId === record.id && item.version === record.version && canonical(item.record) === canonical(record));
  for (const { key, record } of all) {
    if (!sameVersion(key, record)) failGrowth('成长记录与同版本历史内容不一致');
    if (key === 'skillAssessments' && !sameVersion('skillDefinitions', record.standardSnapshot)) failGrowth('测评标准快照缺少一致的历史版本');
    if (key === 'milestones' && record.origin === 'goal' && (record.sourceGoalId !== record.sourceGoalSnapshot?.id || record.sourceGoalVersion !== record.sourceGoalSnapshot?.version || record.sourceGoalSnapshot?.status !== '已达成' || !sameVersion('goals', record.sourceGoalSnapshot))) failGrowth('目标里程碑来源快照与确认历史不一致');
  }
}
export function retainGrowthHistory(current, restored, { actor, now }) {
  const merged = new Map();
  for (const item of [...(current.growthHistory || []), ...(restored.growthHistory || [])]) {
    const key = `${item.collection}/${item.recordId}/${item.version}`, previous = merged.get(key);
    if (previous && canonical(previous) !== canonical(item)) failGrowth('备份同版本成长历史冲突，禁止静默覆盖', 409); merged.set(key, structuredClone(item));
  }
  if (!merged.size) return restored;
  restored.growthHistory = [...merged.values()];
  for (const key of GROWTH_COLLECTIONS) for (let index = 0; index < restored[key].length; index++) {
    const record = restored[key][index];
    if (!growthCollection(key, record)) continue;
    const previous = lookup(current, key, record.id, true) || record;
    restored[key][index] = finish(restored, key, { ...record }, previous, 'backup-restore', actor, now);
  }
  return restored;
}
export function skillTimeline(data, skillId) {
  return records(data, 'skillAssessments').filter(row => (!skillId || row.skillId === skillId) && row.status === '已确认').sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).map(row => ({ id: row.id, skillId: row.skillId, name: row.standardSnapshot.name, dimension: row.standardSnapshot.dimension, date: row.date, level: row.level, definitionVersion: row.definitionVersion, assessor: row.assessor, confirmedBy: row.confirmedBy, evidenceNote: row.evidenceNote }));
}
