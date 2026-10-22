import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState } from '../shared/domain.mjs';
import { newEntryFlow, advanceEntryFlow, entryContext, entryDefaults, validEntryFlow } from '../src/services/entry-flow.js';

test('后续错误和刷新不撤销已保存训练，也不为同一步重试生成新请求', () => {
  const first = newEntryFlow('training');
  const saved = advanceEntryFlow(first, { type: 'saved', collection: 'trainings', id: 'training-real' });
  const next = advanceEntryFlow(saved, { type: 'step', step: 'media' });
  const failed = advanceEntryFlow(next, { type: 'failed', message: '断网，结果待核对' });
  assert.equal(failed.trainingId, 'training-real'); assert.equal(failed.requests.media, next.requests.media);
  assert.deepEqual(failed.scoreIds, []); assert.equal(failed.step, 'media');
  assert.equal(validEntryFlow(JSON.parse(JSON.stringify(failed))), true);
  assert.throws(() => advanceEntryFlow(saved, { type: 'step', step: 'training' }), /已保存/);
});
test('恢复必须核对主记录存在，不能把已删除主训练静默新建替代', () => {
  const flow = newEntryFlow('training', { trainingId: 'saved-training' }), data = emptyState();
  assert.equal(entryContext(flow, data).blocked, true);
  data.trainings.push({ id: 'saved-training', date: '2000-01-01' });
  assert.equal(entryContext(flow, data).blocked, false);
  data.trainings = []; data.trash.push({ collection: 'trainings', record: { id: 'saved-training' } });
  assert.equal(entryContext(flow, data).blocked, true);
});
test('预填只带已确认活动上下文，不带上一条真实成绩、量、测评等级或证据', () => {
  const data = emptyState(); data.trainings.push({ id: 'training-real', date: '2000-01-01', stroke: '自由泳', totalMeters: 200, durationMinutes: 30 });
  data.skillDefinitions = [{ id: 'skill-real', version: 2, status: '启用' }]; data.skillAssessments = [{ date: '2000-01-01', skillId: 'skill-real', level: 'L5', evidenceNote: '旧观察' }];
  const context = { trainingId: 'training-real' };
  const score = entryDefaults('score', context, data); assert.equal(score.trainingId, 'training-real'); assert.equal(score.date, '2000-01-01'); assert.equal(score.time, ''); assert.equal(score.validityStatus, '未核验');
  assert.equal(entryDefaults('training', {}, data).totalMeters, undefined);
  const skill = entryDefaults('skill', {}, data); assert.equal(skill.skillId, 'skill-real'); assert.equal(skill.definitionVersion, 2); assert.equal(skill.level, ''); assert.equal(skill.evidenceNote, '');
});
test('流程草稿拒绝损坏步骤/请求ID/附带文件或私有表单快照', () => {
  const flow = newEntryFlow('score'); assert.equal(validEntryFlow(flow), true);
  for (const patch of [{ step: 'unknown' }, { requests: {} }, { scoreIds: [null] }, { file: 'raw bytes' }]) assert.equal(validEntryFlow({ ...flow, ...patch }), false);
});
