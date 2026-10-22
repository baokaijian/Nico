import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecord, normalizeState, emptyState } from '../shared/domain.mjs';
const levels = { L1: '协议标准一', L2: '协议标准二', L3: '协议标准三', L4: '协议标准四', L5: '协议标准五' };
const standard = { name: '协议自由泳标准', dimension: '自由泳', levels, status: '启用', reviewedBy: '协议审核', notes: '' };
const assessment = { skillId: 'skill-a', definitionVersion: 1, date: '2000-01-01', assessor: '协议评估', level: 'L2', status: '待确认', evidenceNote: '协议测试中的实际观察', evidenceRefs: [], improvementNote: '协议改进说明', previousAssessmentId: '', weakPointId: '', checkinIds: [] };
const goal = { modelVersion: 1, title: '协议目标', category: '技能', baselineText: '协议起点', baselineRefs: [], targetResult: '协议目标结果', deadline: '2000-02-01', criteria: '复测达到已配置标准', relatedTrainingIds: [], relatedSkillIds: ['skill-a'], targetSkillLevel: 'L3', status: '进行中', notes: '' };

test('可配置八维内部五级标准，启用需人工审核且五级标准完整', () => {
  for (const dimension of ['水中安全', '呼吸及水感', '自由泳', '仰泳', '蛙泳', '蝶泳', '出发和转身', '训练行为']) {
    const record = validateRecord('skillDefinitions', { ...standard, dimension }); assert.equal(record.dimension, dimension); assert.equal(record.levels.L5, '协议标准五');
  }
  assert.throws(() => validateRecord('skillDefinitions', { ...standard, levels: { L1: '不完整' } }), /五级/);
  assert.throws(() => validateRecord('skillDefinitions', { ...standard, reviewedBy: '' }), /审核/);
  assert.throws(() => validateRecord('skillDefinitions', { ...standard, dimension: '自动天赋评分' }), /维度/);
});

test('评估必须由人选择等级和记录观察，不能写入已确认状态或伪造元数据', () => {
  const record = validateRecord('skillAssessments', assessment); assert.equal(record.level, 'L2'); assert.equal(record.status, '待确认');
  assert.throws(() => validateRecord('skillAssessments', { ...assessment, level: '' }), /等级/);
  assert.throws(() => validateRecord('skillAssessments', { ...assessment, evidenceNote: '' }), /证据/);
  assert.throws(() => validateRecord('skillAssessments', { ...assessment, status: '已确认' }), /确认/);
  assert.throws(() => validateRecord('skillAssessments', { ...assessment, confirmedAt: '2000-01-01T00:00:00Z' }), /字段/);
});

test('增强目标保持旧原文，新目标需基线、结果、截止与标准，完成归档必须专门人工动作', () => {
  const old = emptyState(); old.goals = [{ id: 'legacy-goal', title: '旧目标', targetMetric: '原文', status: '已达成' }];
  assert.deepEqual(normalizeState(old).goals[0], old.goals[0]);
  const record = validateRecord('goals', goal); assert.equal(record.baselineText, '协议起点'); assert.equal(record.status, '进行中');
  for (const field of ['baselineText', 'targetResult', 'deadline', 'criteria']) assert.throws(() => validateRecord('goals', { ...goal, [field]: '' }));
  for (const status of ['已达成', '已归档']) assert.throws(() => validateRecord('goals', { ...goal, status }), /确认|归档/);
});

// Draft shape validation permits incomplete text while isolating broken nested controls.
import { validGrowthDraft } from '../src/services/drafts.js';
test('成长草稿允许未填写内容，拒绝损坏的标准、证据及关联数组', () => {
  const value = { values: { levels: { L1: '', L2: '', L3: '', L4: '', L5: '' }, evidenceRefs: [], relatedSkillIds: [], title: '' }, editing: null, baseRevision: 1, clientRequestId: 'protocol-draft' };
  assert.equal(validGrowthDraft(value), true);
  for (const patch of [{ levels: null }, { evidenceRefs: [null] }, { relatedSkillIds: {} }]) assert.equal(validGrowthDraft({ ...value, values: { ...value.values, ...patch } }), false);
});
