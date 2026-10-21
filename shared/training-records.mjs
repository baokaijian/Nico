import { digestHex } from './password.mjs';
const fail = (status, message) => Object.assign(new Error(message), { status });
export const trainingCollection = key => ['trainings', 'trainingTemplates'].includes(key);
export async function creationRequest(input, actor) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail(400, '记录格式无效');
  if (input.clientRequestId === undefined) return null; // Older clients remain compatible.
  if (typeof input.clientRequestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(input.clientRequestId)) throw fail(400, '新建请求标识无效');
  const canonical = JSON.stringify(input, (_, value) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
  return { id: input.clientRequestId, hash: await digestHex(canonical), actor };
}
export function creationReplay(data, key, request) {
  if (!request) return null;
  const found = data[key].find(row => row.creationRequest?.id === request.id);
  const deleted = data.trash?.find(item => item.collection === key && item.record.creationRequest?.id === request.id);
  if (deleted) throw fail(409, '此请求对应记录已在回收站，请先核对或恢复原记录');
  if (!found) return null;
  if (found.creationRequest.hash !== request.hash || found.creationRequest.actor !== request.actor) throw fail(409, '此请求已保存过不同内容，请刷新核对原记录；需要另建时请清空表单');
  return found;
}
export function stampTraining(record, previous, actor, timestamp, request = null) {
  Object.assign(record, { athleteId: previous?.athleteId || 'nico', updatedAt: timestamp, updatedBy: actor });
  if (!previous) Object.assign(record, { createdAt: timestamp, createdBy: actor, ...(request ? { creationRequest: request } : {}) });
  return record;
}
export function trainingRelations(key, record, data, previous = null) {
  if (key !== 'trainings') return;
  for (const id of record.mediaIds || []) {
    if (!data.media.some(m => m.id === id) && !previous?.mediaIds?.includes(id)) throw fail(400, '关联影像不存在或已移入回收站');
  }
  if (record.copiedFromId && record.copiedFromId !== previous?.copiedFromId && ![...data.trainings, ...data.trash.filter(t => t.collection === 'trainings').map(t => t.record)].some(t => t.id === record.copiedFromId)) throw fail(400, '复制来源训练不存在');
  if (record.templateId && (record.templateId !== previous?.templateId || record.templateVersion !== previous?.templateVersion)) {
    const template = data.trainingTemplates.find(t => t.id === record.templateId);
    if (!template || template.version !== record.templateVersion) throw fail(409, '模板已改变或已删除，请刷新并重新选择');
  }
  if (!record.templateId && record.templateVersion) throw fail(400, '模板版本缺少模板ID');
  if (record.plannedSessionId && record.plannedSessionId !== previous?.plannedSessionId) {
    const plan = data.plans.find(p => p.sessions?.some(s => `${p.id}/${s.id}` === record.plannedSessionId));
    if (!plan) throw fail(400, '关联计划课次不存在');
    if (record.plannedSessionVersion != null && plan.version !== record.plannedSessionVersion) throw fail(409, '计划已改变，请刷新后重新选择课次');
    const session = plan.sessions.find(s => `${plan.id}/${s.id}` === record.plannedSessionId);
    record.plannedSessionVersion = plan.version;
    record.plannedSessionSnapshot = { planId: plan.id, planTitle: plan.title, planVersion: plan.version, session: structuredClone(session) };
  } else if (record.plannedSessionId) {
    // The immutable original link may outlive an edited/deleted plan. Never guess a legacy version.
    record.plannedSessionVersion = previous.plannedSessionVersion ?? null;
    if (previous.plannedSessionSnapshot) record.plannedSessionSnapshot = previous.plannedSessionSnapshot;
  } else {
    record.plannedSessionVersion = null; delete record.plannedSessionSnapshot;
  }
}
