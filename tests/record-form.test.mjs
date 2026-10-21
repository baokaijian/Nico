import test from 'node:test';
import assert from 'node:assert/strict';
import { FIELDS, validateRecord } from '../shared/domain.mjs';
import { recordFormFields, changeRecordField } from '../src/services/record-form.js';
const screenshot = { date: '2026-10-21', distance: '50m', stroke: '打腿', poolLength: '25m', time: '01:09:00', startType: '蹬壁', timingMethod: '手动计时', recordType: '训练', validityStatus: '有效', testItem: '' };
test('打腿成绩必须在主表单完成具体项目选择，全部可选项可通过实际校验', () => {
  const form = recordFormFields('swim', FIELDS.swim, screenshot);
  const item = form.primary.find(field => field.key === 'testItem');
  assert.ok(item, '具体打腿项目不能隐藏在可选的详细字段中');
  assert.equal(item.required, true);
  assert.ok(item.options.includes('抱板打腿')); assert.ok(item.options.includes('自由泳打腿'));
  assert.ok(!form.secondary.some(field => field.key === 'testItem'), '不能出现重复表单字段');
  assert.throws(() => validateRecord('swim', screenshot), /打腿项目/);
  for (const selected of item.options) {
    const saved = validateRecord('swim', { ...screenshot, testItem: selected });
    assert.equal(saved.timeMs, 69000); assert.equal(saved.testItem, selected); assert.equal(saved.poolLength, '25m');
  }
});
test('切换泳姿清空不匹配的旧项目，保留时间、距离、备注和其他草稿内容', () => {
  const draft = { ...screenshot, stroke: '自由泳', testItem: '自由泳', time: '69.001', notes: '保留原输入' };
  const before = structuredClone(draft);
  const changed = changeRecordField('swim', draft, 'stroke', '打腿');
  assert.deepEqual(changed, { ...before, stroke: '打腿', testItem: '' }); assert.deepEqual(draft, before);
  assert.equal(changeRecordField('swim', { ...screenshot, testItem: '抱板打腿' }, 'stroke', '蛙泳').testItem, '');
  assert.equal(changeRecordField('swim', { ...screenshot, testItem: '抱板打腿' }, 'stroke', '打腿').testItem, '抱板打腿');
  assert.equal(changeRecordField('swim', draft, 'time', '69.002').testItem, '自由泳');
});
test('普通成绩不强制打腿项目，编辑及恢复的具体项目保持可用且不修改全局字段', () => {
  const before = structuredClone(FIELDS.swim);
  const ordinary = { ...screenshot, stroke: '自由泳', testItem: '' };
  const field = recordFormFields('swim', FIELDS.swim, ordinary).primary.find(f => f.key === 'testItem');
  assert.equal(field?.required ?? false, false); assert.equal(validateRecord('swim', ordinary).timeMs, 69000);
  const restored = { ...screenshot, testItem: '仰泳打腿' };
  assert.ok(recordFormFields('swim', FIELDS.swim, restored).primary.find(f => f.key === 'testItem')?.options.includes(restored.testItem));
  assert.deepEqual(FIELDS.swim, before);
});
