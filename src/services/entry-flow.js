import { today } from './files.js';
const types = ['training', 'score', 'skill', 'media'];
const steps = [...types, 'feedback', 'summary', 'goals', 'review'];
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const ids = value => Array.isArray(value) && value.length <= 100 && value.every(id) && new Set(value).size === value.length;
export function newEntryFlow(type, context = {}) {
  if (!types.includes(type)) throw new Error('不支持的快捷录入类型');
  return { version: 1, id: crypto.randomUUID(), type, step: context.trainingId ? 'summary' : type, trainingId: context.trainingId || '', recordId: context.recordId || '', scoreIds: [], mediaIds: [], assessmentIds: [], feedbackSaved: false, requests: Object.fromEntries(types.map(key => [key, crypto.randomUUID()])), error: '' };
}
export function validEntryFlow(flow) {
  return !!flow && typeof flow === 'object' && !Array.isArray(flow) && Object.keys(flow).every(key => ['version', 'id', 'type', 'step', 'trainingId', 'recordId', 'scoreIds', 'mediaIds', 'assessmentIds', 'feedbackSaved', 'requests', 'error'].includes(key)) && flow.version === 1 && id(flow.id) && types.includes(flow.type) && steps.includes(flow.step) && (flow.trainingId === '' || id(flow.trainingId)) && (flow.recordId === '' || id(flow.recordId)) && ids(flow.scoreIds) && ids(flow.mediaIds) && ids(flow.assessmentIds) && typeof flow.feedbackSaved === 'boolean' && flow.requests && Object.keys(flow.requests).length === types.length && types.every(key => id(flow.requests[key])) && typeof flow.error === 'string' && flow.error.length <= 500;
}
export function advanceEntryFlow(flow, event) {
  if (!validEntryFlow(flow)) throw new Error('连续录入草稿格式无效');
  const next = structuredClone(flow); next.error = '';
  if (event.type === 'step') {
    if (!steps.includes(event.step)) throw new Error('无效步骤');
    if (event.step === 'training' && next.trainingId) throw new Error('主训练已保存，请从完成摘要继续补充');
    if (event.step === 'feedback' && !next.trainingId) throw new Error('请先保存本次训练');
    next.step = event.step;
  } else if (event.type === 'failed') next.error = String(event.message || '后续步骤未完成').slice(0, 500);
  else if (event.type === 'feedback') { next.feedbackSaved = true; next.step = 'summary'; }
  else if (event.type === 'saved') {
    if (!id(event.id)) throw new Error('服务端记录ID无效');
    const names = { swim: ['scoreIds', 'score'], media: ['mediaIds', 'media'], skillAssessments: ['assessmentIds', 'skill'] };
    if (event.collection === 'trainings') { if (next.trainingId && next.trainingId !== event.id) throw new Error('主训练已保存，不能替换'); next.trainingId = event.id; }
    else { const [field, type] = names[event.collection] || []; if (!field) throw new Error('不支持的连续录入实体'); if (!next[field].includes(event.id)) { next[field].push(event.id); next.requests[type] = crypto.randomUUID(); } }
    next.step = 'summary';
  } else throw new Error('未知流程事件');
  return next;
}
export function entryContext(flow, data) {
  const training = flow.trainingId ? data.trainings.find(row => row.id === flow.trainingId) : null;
  if (flow.trainingId && !training) return { blocked: true, message: '已保存主训练不在当前记录中，可能已移入回收站。请先刷新核对或恢复原记录，不会自动新建替代。' };
  const recordId = training?.id || flow.recordId || flow.scoreIds.at(-1) || '';
  return { blocked: false, training, trainingId: training?.id || '', recordId };
}
export function entryDefaults(type, context, data) {
  const training = data.trainings.find(row => row.id === context.trainingId), record = training || data.swim.find(row => row.id === context.recordId), date = record?.date || today();
  if (type === 'training') return { date: today(), completionStatus: '未记录' };
  if (type === 'score') return { date, trainingId: training?.id || '', stroke: ['自由泳', '仰泳', '蛙泳', '蝶泳', '混合泳', '打腿'].includes(training?.stroke) ? training.stroke : '', time: '', validityStatus: '未核验', recordType: training ? '训练' : '' };
  if (type === 'skill') {
    const recent = [...data.skillAssessments].sort((a, b) => b.date.localeCompare(a.date)).find(row => data.skillDefinitions.some(definition => definition.id === row.skillId && definition.status === '启用'));
    const definition = data.skillDefinitions.find(row => row.id === recent?.skillId);
    return { date, evidenceRefs:training?[{collection:'trainings',id:training.id}]:[], ...(definition ? { skillId: definition.id, definitionVersion: definition.version } : {}), level: '', evidenceNote: '' };
  }
  return { date, recordId: record?.id || '' };
}
// Keep the root receipt discoverable while any optional form remains unsubmitted.
export function canFinishEntryFlow(list, flowId) {
  return list?.status === 'ready' && !list.items.some(item => item.collection.startsWith(`quick.${flowId}.`) && ['ready','expired','corrupt','unavailable'].includes(item.status));
}
