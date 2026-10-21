import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, normalizeState, validateRecord, rangeSummary } from '../shared/domain.mjs';
import { setTotals, validateTrainingSets, trainingDraft, trainingFacts, trainingSummary } from '../shared/training.ts';
const group = (actual = null, extra = {}) => ({ id: 'set-a', task: '隔离协议样例', stroke: '自由泳', distanceMeters: 25, plannedRepeats: 4, completedRepeats: actual, restSeconds: 20, isKick: false, ...extra });
const record = (sets, extra = {}) => validateRecord('trainings', { date: '2000-01-01', entryMode: '训练组', sets, ...extra });
test('实际组数与计划分离，未知、零和部分完成分别保留', () => {
  const unknown = record([group()]); assert.equal(unknown.totalMeters, null); assert.equal(trainingFacts(unknown).occurred, false);
  const zero = record([group(0)]); assert.equal(zero.totalMeters, 0); assert.equal(trainingFacts(zero).occurred, false);
  const partial = record([group(2), group(null, { id: 'set-b' })], { completionStatus: '部分完成' });
  assert.equal(partial.totalMeters, null); assert.equal(trainingFacts(partial).knownMeters, 50); assert.equal(trainingFacts(partial).unknownSets, 1);
  const done = record([group(4, { isKick: true })], { completionStatus: '已完成', totalMeters: 999 });
  assert.equal(done.totalMeters, 100); assert.equal(done.kickMeters, 100);
  assert.throws(() => record([group(2)], { completionStatus: '已完成' }), /完成状态/);
  assert.throws(() => record([group(1)], { completionStatus: '已取消' }), /实际训练量/);
  assert.throws(() => record([group(1)], { completionStatus: '未完成' }), /实际训练量/);
});
test('组表约束拦截重复ID、超量、非整数次数、越界和非法字段', () => {
  for (const sets of [[group(1), group(2)], [group(-1)], [group(1.5)], [group('Infinity')], [group(2001)], [group(1, { distanceMeters: 0 })], [group(1, { distanceMeters: 25.001 })], [group(2000, { distanceMeters: 5000 })], [group(1, { extra: 1 })], Array.from({ length: 51 }, (_, i) => group(1, { id: `s-${i}` }))]) assert.throws(() => record(sets));
  assert.throws(() => validateRecord('trainings', { date: '2000-01-01', entryMode: '快速', sets: [group(1)] }), /快速模式/);
  assert.equal(setTotals(validateTrainingSets([group(3, { distanceMeters: 12.34 })])).totalMeters, 37.02);
});
test('复制与模板只保留安排，不复制完成事实、影像或创建标识', () => {
  const source = { ...record([group(4)], { durationMinutes: 30, completionStatus: '已完成', feeling: '原感受', coachNotes: '原反馈', mediaIds: ['media-a'] }), id: 'train-a', date: '2000-01-01', creationRequest: { id: 'old' }, createdAt: 'old', plannedSessionId: 'plan-a/a' };
  const copied = trainingDraft(source);
  assert.equal(copied.sets[0].plannedRepeats, 4); assert.equal(copied.sets[0].completedRepeats, null);
  for (const key of ['id', 'date', 'createdAt', 'creationRequest', 'feeling', 'coachNotes', 'plannedSessionId']) assert.equal(copied[key], undefined);
  assert.equal(copied.durationMinutes, null); assert.equal(copied.totalMeters, null); assert.deepEqual(copied.mediaIds, []);
  assert.equal(copied.copiedFromId, source.id);
  assert.throws(() => validateRecord('trainingTemplates', { title: '样例', entryMode: '训练组', sets: [group(4)] }), /不能保存实际/);
  const template = { ...validateRecord('trainingTemplates', { title: '家长安排', entryMode: '训练组', sets: [group()] }), id: 'template-a' };
  assert.equal(template.plannedMeters, 100); assert.equal(template.version, 1);
  const next = validateRecord('trainingTemplates', { title: '改名' }, template); assert.equal(next.version, 2);
  const used = trainingDraft(template, true); assert.equal(used.templateId, template.id); assert.equal(used.templateVersion, 1); assert.equal(trainingFacts(used).knownMeters, 0);
});
test('统计排除取消、保留未知分母，泳姿按已知实际距离计算', () => {
  const rows = [record([group(2), group(null, { id: 'b', stroke: '蛙泳' })]), validateRecord('trainings', { date: '2000-01-02', totalMeters: 200, durationMinutes: 30, stroke: '蛙泳' }), validateRecord('trainings', { date: '2000-01-03', completionStatus: '已取消' }), { id: 'legacy', date: '2000-01-04', totalMeters: null }];
  const summary = trainingSummary(rows); assert.equal(summary.count, 2); assert.equal(summary.knownMeters, 250); assert.equal(summary.meters, 200); assert.equal(summary.minutes, 30); assert.equal(summary.minutesCount, 1); assert.equal(summary.unknownSets, 1); assert.deepEqual(summary.strokes, { 自由泳: 50, 蛙泳: 200 });
  assert.equal(trainingFacts({ completionStatus: '已取消', totalMeters: 999, durationMinutes: 99 }).knownMeters, 0);
  const state = emptyState(); state.trainings = rows.map((r, i) => ({ ...r, id: `t${i}` }));
  state.plans = [{ id: 'plan-a', status: '已确认', sessions: [{ id: 's', date: '2000-01-01', type: '训练' }] }];
  state.trainings[0].plannedSessionId = 'plan-a/s';
  const range = rangeSummary(state, '2000-01-01', '2000-01-31'); assert.equal(range.coverage, 100); assert.equal(range.planCompletionRate, 0); assert.equal(range.knownMeters, 250);
  state.plans[0].version = 2;
  state.trainings[0].completionStatus = '已完成'; state.trainings[0].plannedSessionVersion = 1;
  const updatedPlan = rangeSummary(state, '2000-01-01', '2000-01-31'); assert.equal(updatedPlan.coverage, 0); assert.equal(updatedPlan.planCompletionRate, 0, '旧版记录不能代替新版计划确认完成');
  state.trainings[0].plannedSessionVersion = 2; assert.equal(rangeSummary(state, '2000-01-01', '2000-01-31').planCompletionRate, 100);
});
test('旧训练与备份不改写，新组表汇总不一致禁止恢复', () => {
  const legacy = { ...emptyState(), trainings: [{ id: 'old', date: '2000-01-01', totalMeters: 200, coachNotes: '原话' }] }; delete legacy.trainingTemplates;
  const before = structuredClone(legacy); const normalized = normalizeState(legacy);
  assert.deepEqual(legacy, before); assert.deepEqual(normalized.trainings, legacy.trainings); assert.deepEqual(normalized.trainingTemplates, []);
  assert.equal(normalized.trainings[0].createdAt, undefined);
  const bad = emptyState(); bad.trainings = [{ ...record([group(4)]), id: 'new', totalMeters: 101 }]; assert.throws(() => normalizeState(bad), /汇总不一致/);
  assert.throws(() => validateRecord('trainings', { date: '2000-01-01', createdAt: 'invented' }), /不支持/);
});
