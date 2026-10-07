import test from 'node:test';
import assert from 'node:assert/strict';
import { raw } from './fixture.mjs';
import { analysis, best, parseTime, normalizeState, validateRecord, publicSnapshot, rangeSummary, validDate, WOMEN_50 } from '../shared/domain.mjs';
import { reportHTML } from '../shared/reports.mjs';
const data = normalizeState(raw);
test('原始输入完整保留，所有新集合为空，不生成实测数据', () => {
  for (const key of Object.keys(raw)) assert.deepEqual(data[key], raw[key]);
  assert.deepEqual(data.plans, []); assert.deepEqual(data.annotations, []);
  const before = JSON.stringify(data); analysis(data); reportHTML(data, '2026-10-01', '2026-10-07'); assert.equal(JSON.stringify(data), before);
});
test('同项目PB与分析只来自录入记录，25米不会污染50米', () => {
  const long = raw.swim.filter(r => r.distance === '50m' && r.poolLength === '50m');
  const expected = Math.min(...long.map(r => r.seconds));
  assert.equal(best(data.swim).seconds, expected);
  assert.equal(best(data.swim, '25m', '自由泳', '25m').seconds, Math.min(...raw.swim.filter(r => r.distance === '25m' && r.poolLength === '25m').map(r => r.seconds)));
  const result = analysis(data); assert.ok(result.facts[1].text.includes((long[0].seconds - expected).toFixed(2)));
  assert.match(result.focus, /出发、蹬壁和短段加速/);
  assert.ok(result.facts.some(f => /体能已录入0条/.test(f.text)));
  assert.ok(result.facts.some(f => /原始目标的/.test(f.text)));
  assert.deepEqual(analysis(data), analysis(data));
});
test('日期和成绩严格解析，拒绝非数值、负数、无效日期', () => {
  assert.equal(parseTime('00:30.50'), 30.5); assert.equal(parseTime('28'), 28);
  for (const value of ['abc', '-1', 'Infinity', '00:60', '0', '1:2:3']) assert.equal(parseTime(value), null);
  assert.equal(validDate('2026-02-30'), false); assert.equal(validDate('2024-02-29'), true);
  assert.throws(() => validateRecord('swim', { date: '2026-10-06', distance: '50m', stroke: '自由泳', poolLength: '50m', time: 'abc' }));
});
test('未填写与0不同，非法泳程、RPE和完成度被拒绝', () => {
  const zero = validateRecord('trainings', { date: '2026-10-06', completionRate: 0, totalMeters: 0, kickMeters: 0 });
  assert.equal(zero.completionRate, 0); assert.equal(zero.rpe, null);
  assert.equal(validateRecord('fitness', { date: '2026-10-06' }).standingJump, null);
  const recovery = validateRecord('nutrition', { date: '2026-10-06' }); assert.equal(recovery.sleepHours, null); assert.equal(recovery.calciumTaken, null);
  for (const fields of [{ totalMeters: -1 }, { rpe: 99 }, { completionRate: 150 }, { totalMeters: 0, kickMeters: 1 }, { rpe: true }, { totalMeters: '10x' }]) assert.throws(() => validateRecord('trainings', { date: '2026-10-06', ...fields }));
  assert.throws(() => validateRecord('nutrition', { date: '2026-10-06', calciumTaken: true }));
});
test('组表总量、周期、审核与时间点都有约束', () => {
  const plan = { title: '测试用计划（不写入真实库）', startDate: '2026-10-06', endDate: '2026-10-07', focus: '字段校验', status: '草稿', sessions: [{ id: 'fixture', date: '2026-10-06', type: '训练', sets: [{ task: '校验算术', repeats: 4, distance: 25, restSeconds: 30 }] }] };
  assert.equal(validateRecord('plans', plan).sessions[0].totalMeters, 100);
  assert.throws(() => validateRecord('plans', { ...plan, status: '已确认' }));
  assert.throws(() => validateRecord('plans', { ...plan, sessions: [{ ...plan.sessions[0], date: '2026-10-08' }] }));
  assert.throws(() => validateRecord('plans', { ...plan, sessions: [plan.sessions[0], plan.sessions[0]] }));
  assert.throws(() => validateRecord('plans', { ...plan, sessions: null }));
  assert.throws(() => validateRecord('plans', { ...plan, sessions: [{ ...plan.sessions[0], durationMinutes: true }] }));
  const saved = validateRecord('plans', plan);
  assert.throws(() => validateRecord('plans', { startDate: '2026-10-07' }, saved));
  assert.throws(() => normalizeState({ ...data, plans: [{ ...saved, id: 'invalid-plan', sessions: null }] }));
  assert.throws(() => validateRecord('annotations', { mediaId: raw.media[0].id, startSecond: 5, endSecond: 2, observation: '测试校验', status: '草稿' }));
});
test('公开摘要默认空，白名单不包含私有字段', () => {
  assert.deepEqual(publicSnapshot(data), { publishedAt: null, story: '', swim: [], media: [] });
  const selection = { swimIds: [raw.swim[0].id], mediaIds: [raw.media[0].id], story: '测试范围', confirmedBy: '测试确认人', confirmedAt: '2026-10-06' };
  const snapshot = publicSnapshot(data, selection); assert.equal(snapshot.swim.length, 1);
  assert.equal(snapshot.swim[0].notes, undefined); assert.equal(snapshot.media[0].description, undefined);
  assert.equal(snapshot.growth, undefined); assert.equal(snapshot.nutrition, undefined);
});
test('周期报告有全部7章，缺少分母不编覆盖率，安全转义原始文本', () => {
  const summary = rangeSummary(data, '2026-10-01', '2026-10-07'); assert.equal(summary.coverage, null); assert.equal(summary.meters, null); assert.equal(summary.sleep, null);
  const html = reportHTML(data, '2026-10-01', '2026-10-07'); assert.equal((html.match(/<h2>/g) || []).length, 7); assert.ok(html.includes(best(data.swim).seconds.toFixed(2))); assert.match(html, /未记录/); assert.match(html, /未记录/);
  const modified = structuredClone(data); modified.profile.name = '<script>alert(1)</script>';
  assert.ok(!reportHTML(modified, '2026-10-01', '2026-10-07').includes('<script>'));
  assert.equal(WOMEN_50.自由泳['50m'].三级, 36); assert.equal(WOMEN_50.自由泳['25m'].三级, 34);
});
