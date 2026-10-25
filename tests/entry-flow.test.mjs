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

test('结束时未提交的补充草稿仍有恢复入口，未知存储状态不当作已清空', async () => {
  const { canFinishEntryFlow } = await import('../src/services/entry-flow.js');
  assert.equal(canFinishEntryFlow({status:'ready',items:[{collection:'quick.flow-a.swim',status:'ready'}]},'flow-a'),false);
  assert.equal(canFinishEntryFlow({status:'ready',items:[{collection:'quick.flow-b.swim',status:'ready'}]},'flow-a'),true);
  assert.equal(canFinishEntryFlow({status:'unavailable',items:[]},'flow-a'),false);
});
test('训练后的测评沿用本次日期和来源，新增目标/复盘步骤可恢复且不复制等级',()=>{const d=emptyState();d.trainings=[{id:'t',date:'2000-01-03',totalMeters:100,stroke:'自由泳'}];const flow=advanceEntryFlow(newEntryFlow('training'),{type:'saved',collection:'trainings',id:'t'});const context=entryContext(flow,d),skill=entryDefaults('skill',context,d);assert.equal(skill.date,'2000-01-03');assert.deepEqual(skill.evidenceRefs,[{collection:'trainings',id:'t'}]);assert.equal(skill.level,'');assert.equal(skill.evidenceNote,'');for(const step of ['goals','review']){const next=advanceEntryFlow(flow,{type:'step',step});assert.equal(validEntryFlow(next),true);assert.equal(next.trainingId,'t');assert.deepEqual(next.scoreIds,[]);}});
