import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState } from '../shared/domain.mjs';
import { reportHTML } from '../shared/reports.mjs';
import { syncPlanDraft } from '../shared/plan-engine.mjs';

// Fixed protocol cases only. Every expected number below is recomputed here from
// the same fixture inputs, so the report can never pass with fabricated values.
const now = '2026-10-19T08:00:00.000Z';
const end = '2026-10-19';
const score = (id, date, time) => ({ id, date, time, distance: '50m', stroke: '自由泳', poolLength: '50m' });
const training = (id, date, totalMeters) => ({ id, date, totalMeters });
const build = overrides => { const state = emptyState(); Object.assign(state, overrides); return state; };
const scores = [score('t-score-1', '2026-08-01', '00:40.00'), score('t-score-2', '2026-09-15', '00:38.00')];
// Nine training records over four distinct weeks inside the window ending 2026-10-19.
const trainings = [
  training('t-tr-1', '2026-09-23', 1000), training('t-tr-2', '2026-09-25', 1000),
  training('t-tr-3', '2026-09-30', 1000), training('t-tr-4', '2026-10-02', 1000),
  training('t-tr-5', '2026-10-07', 1000), training('t-tr-6', '2026-10-09', 1000),
  training('t-tr-7', '2026-10-14', 1000), training('t-tr-8', '2026-10-16', 1000),
  training('t-tr-9', '2026-10-18', 1000),
];

test('空库报告不出现计划草稿的任何数值，且给出不生成的原因', () => {
  const html = reportHTML(emptyState(), '2026-09-01', end);
  assert.match(html, /尚无自动生成的计划草稿/);
  assert.match(html, /训练量参考区间：数据不足，未生成数值/);
  assert.match(html, /强度安排：数据不足，未生成安排建议/);
  assert.doesNotMatch(html, /活跃周/);
  assert.doesNotMatch(html, /训练量参考区间：[0-9]/);
  assert.doesNotMatch(html, /NaN|undefined/);
});

test('报告第3章引用服务端生成的草稿：引擎标识、数据范围与来源记录ID', () => {
  const state = build({ swim: scores, trainings: trainings.slice(0, 8) });
  const next = structuredClone(state);
  next.trainings.push(trainings[8]);
  assert.equal(syncPlanDraft(state, next, { now, triggeredByRecordId: 't-tr-9' }).changed, true);
  const html = reportHTML(next, '2026-09-01', end);
  // Provenance: engine identity, draft version and the data range actually entered.
  assert.match(html, /引擎rules-v1/);
  assert.match(html, /版本1/);
  assert.match(html, /依据的数据范围：2026-08-01—2026-10-18/);
  assert.match(html, /swim 2条、trainings 9条/);
  // Volume references recomputed independently from the same nine records.
  const weekly = [2000, 2000, 2000, 3000];
  const average = weekly.reduce((a, b) => a + b, 0) / weekly.length;
  assert.match(html, new RegExp(`${Math.round(average * 0.9)}—${Math.round(average * 1.1)}m \\/ 活跃周`));
  assert.match(html, /实测周均2250m/);
  assert.match(html, /t-tr-1、t-tr-2、t-tr-3/);
  assert.match(html, /周期划分：2026-10-19—2026-11-15/);
  assert.doesNotMatch(html, /NaN|undefined/);
});

test('训练量与强度数据不足时报告保留空态文案，不输出参考数值', () => {
  const state = build({ swim: scores, trainings: [training('t-tr-1', '2026-10-01', 1000)] });
  const next = structuredClone(state);
  next.trainings.push(training('t-tr-2', '2026-10-08', 1000));
  assert.equal(syncPlanDraft(state, next, { now, triggeredByRecordId: 't-tr-2' }).changed, true);
  const html = reportHTML(next, '2026-09-01', end);
  assert.match(html, /数据不足，未生成数值/);
  assert.match(html, /强度安排：数据不足/);
  assert.match(html, /≥6条填写了实际泳程的训练记录/);
  assert.match(html, /≥3个不同周/);
  assert.doesNotMatch(html, /活跃周/);
  assert.doesNotMatch(html, /NaN|undefined/);
});
