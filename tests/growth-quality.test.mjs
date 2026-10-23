import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseQuality, recordReferences } from '../shared/data-quality.mjs';
test('质量诊断只根据事实产生八类问题，未知不等于未完成', () => {
  const data = { swim: [{ id: 's', date: '2000-01-01', validityStatus: '未核验', trainingId: 'gone' }], trainings: [{ id: 't', plannedMeters: 1000 }], media: [{ id: 'm' }], skillAssessments: [{ id: 'a', status: '待确认', skillId: 'gone' }], goals: [{ id: 'g', status: '进行中', deadline: '2000-01-01' }], milestones: [{ id: 'l', status: '待确认' }] };
  const before = structuredClone(data), issues = diagnoseQuality(data, '2000-01-02');
  assert.equal(new Set(issues.map(row => row.type)).size, 8); assert.deepEqual(data, before);
  for (const row of issues) for (const key of ['ruleId','collection','recordId','type','message','priority']) assert.ok(row[key]);
  assert.ok(issues.find(row => row.ruleId === 'DQ-TRAINING-ACTUAL').message.includes('未记录'));
  assert.equal(diagnoseQuality({}, '2000-01-02').length, 0);
  assert.equal(diagnoseQuality({ trainings: [{ id: 'zero', durationMinutes: 0, totalMeters: 0 }] }, '2000-01-02').length, 0);
  assert.equal(diagnoseQuality({ trainings: [{ id: 'cancel', completionStatus: '已取消' }] }, '2000-01-02').length, 0);
});
test('引用包括双向媒体、课次、标准、目标证据；访问失败不凭空推断', () => {
  const data = { plans: [{ id: 'p', sessions: [{ id: 'one' }] }], trainings: [{ id: 't', plannedSessionId: 'p/one', mediaIds: ['m'], durationMinutes: 30 }], media: [{ id: 'm', url: '/uploads/private.mp4' }] };
  assert.equal(diagnoseQuality(data, '2000-01-01').length, 0);
  data.trainings[0].plannedSessionId = 'p/missing';
  assert.ok(diagnoseQuality(data, '2000-01-01').some(row => row.targetRef.id === 'p/missing'));
  assert.deepEqual(recordReferences('goals', { baselineRefs: [{ collection: 'swim', id: 's' }] }), [{ collection: 'swim', id: 's' }]);
});
