import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState } from '../shared/domain.mjs';
import { resolveManagementLocation, sanitizeLocation, createManagementPosition, workbenchModel } from '../src/services/management.js';

test('旧入口可达四入口的真实功能，非法位置不创建额外入口', () => {
  assert.deepEqual(resolveManagementLocation('week'), { section: 'training', view: 'plans' });
  assert.deepEqual(resolveManagementLocation('records', 'swim'), { section: 'training', view: 'swim' });
  assert.deepEqual(resolveManagementLocation('records', 'nutrition'), { section: 'review', view: 'nutrition' });
  assert.deepEqual(resolveManagementLocation('profile'), { section: 'settings', view: 'profile' });
  assert.deepEqual(sanitizeLocation({ section: 'training', view: 'javascript:run' }), { section: 'workbench', view: 'home' });
});
test('上次管理位置按账号/API/档案隔离，退出后旧引用不能覆盖后续账号', () => {
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const a = { backend: 'protocol-a', account: 'a', athlete: 'nico' }, b = { ...a, account: 'b' }; let current = a;
  const first = createManagementPosition({ scope: a, storage, isCurrent: scope => scope === current });
  first.write({ section: 'growth', view: 'goals' });
  assert.deepEqual(first.read(), { section: 'growth', view: 'goals' });
  const second = createManagementPosition({ scope: b, storage }); assert.deepEqual(second.read(), { section: 'workbench', view: 'home' });
  current = b; first.write({ section: 'settings', view: 'backup' }); current = a;
  assert.deepEqual(first.read(), { section: 'growth', view: 'goals' });
  assert.deepEqual(createManagementPosition({ scope: { ...a, backend: 'other' }, storage }).read(), { section: 'workbench', view: 'home' });
});
test('工作台空库没有虚构待办，真实待确认事项才出现，计划/取消量不冒充训练', () => {
  const data = emptyState(); assert.deepEqual(workbenchModel(data, '2000-01-05').pending, []);
  data.skillAssessments = [{ id: 'draft', status: '待确认', date: '2000-01-04', standardSnapshot: { name: '协议标准' } }, { id: 'confirmed', status: '已确认', date: '2000-01-01' }];
  data.milestones = [{ id: 'candidate', status: '待确认', title: '协议事件' }];
  data.goals = [{ id: 'paused', status: '暂停' }, { id: 'active', status: '进行中', title: '协议目标' }];
  data.trainings = [{ id: 'cancelled', date: '2000-01-04', completionStatus: '已取消', plannedMeters: 100 }, { id: 'actual', date: '2000-01-03', totalMeters: 50, durationMinutes: 10 }];
  const result = workbenchModel(data, '2000-01-05');
  assert.deepEqual(result.pending.map(item => item.id).sort(), ['candidate', 'draft']);
  assert.equal(result.summary.count, 1); assert.equal(result.summary.knownMeters, 50); assert.equal(result.latestTraining.id, 'actual');
  assert.deepEqual(result.goals.map(row => row.id), ['active']);
});
