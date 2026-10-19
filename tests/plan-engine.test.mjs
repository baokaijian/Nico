import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { emptyState, normalizeState, analysis } from '../shared/domain.mjs';
import { PLAN_DRAFT_ID, planDimensions, syncPlanDraft, commitPlanUpdate } from '../shared/plan-engine.mjs';
import { openStore } from '../server/store.mjs';

// Fixed protocol cases only; never imported by the app or written into real archives.
const now = '2026-10-19T08:00:00.000Z';
const score = (id, date, time, extra = {}) => ({ id, date, time, distance: '50m', stroke: '自由泳', poolLength: '50m', ...extra });
const training = (id, date, totalMeters, extra = {}) => ({ id, date, totalMeters, ...extra });
const recovery = (id, date, extra = {}) => ({ id, date, ...extra });
const build = overrides => { const state = emptyState(); Object.assign(state, overrides); return state; };
// Eight meter-bearing trainings across four distinct weeks inside the 28-day window.
const currentTrainings = [
  training('t-tr-1', '2026-09-23', 1000, { kickMeters: 200 }),
  training('t-tr-2', '2026-09-25', 1000),
  training('t-tr-3', '2026-09-30', 1000, { kickMeters: 200 }),
  training('t-tr-4', '2026-10-02', 1000),
  training('t-tr-5', '2026-10-07', 1000, { kickMeters: 200 }),
  training('t-tr-6', '2026-10-09', 1000),
  training('t-tr-7', '2026-10-14', 1000, { kickMeters: 200 }),
  training('t-tr-8', '2026-10-16', 1000),
];
const scores = [score('t-score-1', '2026-08-01', '00:40.00'), score('t-score-2', '2026-09-15', '00:38.00')];

test('空库不生成任何数值建议，维度全部进入数据不足状态', () => {
  const state = build({});
  const dims = planDimensions(state, now);
  assert.equal(dims.volume.status, 'insufficient');
  assert.equal(dims.volume.referenceRange, undefined);
  assert.equal(dims.intensity.status, 'insufficient');
  assert.equal(dims.intensity.rpeAverage, null);
  assert.equal(dims.dataRange.start, '');
  assert.equal(dims.dataRange.counts.swim, 0);
  assert.ok(dims.rules.every(rule => !rule.triggered));
  assert.equal(syncPlanDraft(state, structuredClone(state), { now }).changed, false);
});

test('训练量参考区间完全由已录入泳程推导并可溯源', () => {
  const state = build({ swim: scores, trainings: currentTrainings });
  const dims = planDimensions(state, now);
  assert.equal(dims.volume.status, 'ok');
  assert.equal(dims.volume.records, 8);
  assert.equal(dims.volume.weeks, 4);
  assert.equal(dims.volume.meterTotal, 8000);
  assert.equal(dims.volume.averagePerActiveWeek, 2000);
  assert.deepEqual(dims.volume.referenceRange, [1800, 2200]);
  assert.equal(dims.volume.kickRatio, 0.1);
  assert.deepEqual(dims.volume.sourceIds, currentTrainings.map(r => r.id));
  assert.equal(dims.volume.previousAverage, null);
});

test('泳程样本不足时训练量维度保持空状态并说明门槛', () => {
  const state = build({ swim: scores, trainings: [training('t-tr-1', '2026-10-01', 1000), training('t-tr-2', '2026-10-08', 1000)] });
  const volume = planDimensions(state, now).volume;
  assert.equal(volume.status, 'insufficient');
  assert.equal(volume.referenceRange, undefined);
  assert.match(volume.threshold, /≥6条/);
  assert.match(volume.threshold, /≥3个不同周/);
});

test('恢复警示、睡眠下降与高RPE按显式阈值触发强度规则', () => {
  const trainings = [...currentTrainings, training('t-rpe-1', '2026-10-05', 800, { rpe: 8 }), training('t-rpe-2', '2026-10-12', 800, { rpe: 8 }), training('t-rpe-3', '2026-10-13', 800, { rpe: 8 })];
  const nutrition = [
    recovery('t-rec-old-1', '2026-09-01', { sleepHours: 8 }),
    recovery('t-rec-old-2', '2026-09-05', { sleepHours: 8 }),
    recovery('t-rec-old-3', '2026-09-10', { sleepHours: 8 }),
    recovery('t-rec-1', '2026-10-07', { sleepHours: 6 }),
    recovery('t-rec-2', '2026-10-10', { sleepHours: 6, discomfort: '膝部不适' }),
    recovery('t-rec-3', '2026-10-15', { sleepHours: 6, discomfort: '无' }),
  ];
  const dims = planDimensions(build({ swim: scores, trainings, nutrition }), now);
  assert.equal(dims.intensity.status, 'ok');
  assert.equal(dims.intensity.recoveryCount, 3);
  assert.equal(dims.intensity.rpeAverage, 8);
  const ruleFor = id => dims.rules.find(rule => rule.id === id);
  assert.equal(ruleFor('R-REC').triggered, true);
  assert.deepEqual(ruleFor('R-REC').sourceIds, ['t-rec-2']);
  assert.equal(ruleFor('R-SLEEP').triggered, true);
  assert.deepEqual(ruleFor('R-SLEEP').sourceIds, ['t-rec-1', 't-rec-2', 't-rec-3', 't-rec-old-1', 't-rec-old-2', 't-rec-old-3']);
  assert.equal(ruleFor('R-RPE').triggered, true);
  assert.deepEqual(ruleFor('R-RPE').sourceIds, ['t-rpe-1', 't-rpe-2', 't-rpe-3']);
});

test('实际泳程较上一窗口变化超过阈值时触发R-VOL调整规则', () => {
  const previousTrainings = [
    training('t-old-1', '2026-08-26', 500), training('t-old-2', '2026-08-27', 500),
    training('t-old-3', '2026-09-01', 500), training('t-old-4', '2026-09-02', 500),
    training('t-old-5', '2026-09-08', 500), training('t-old-6', '2026-09-09', 500),
  ];
  const dims = planDimensions(build({ swim: scores, trainings: [...previousTrainings, ...currentTrainings] }), now);
  assert.equal(dims.volume.status, 'ok');
  assert.equal(dims.volume.previousAverage, 1000);
  const rule = dims.rules.find(r => r.id === 'R-VOL');
  assert.equal(rule.triggered, true);
  assert.match(rule.text, /重算/);
  assert.match(rule.text, /由家长结合教练反馈确认/);
});

test('草稿同步：创建、幂等跳过、版本递增、历史与触发记录、可过校验', () => {
  const state = build({ swim: scores, trainings: currentTrainings, goals: [{ id: 't-goal-1', title: '测试目标', targetMetric: '36秒' }] });
  const next = structuredClone(state);
  next.trainings.push(training('t-tr-9', '2026-10-18', 1000));
  const first = syncPlanDraft(state, next, { now, triggeredByRecordId: 't-tr-9' });
  assert.equal(first.changed, true);
  const draft = next.plans.find(p => p.id === PLAN_DRAFT_ID);
  assert.equal(draft.status, '草稿');
  assert.equal(draft.version, 1);
  assert.deepEqual(draft.sessions, []);
  assert.equal(draft.sourceVersion, analysis(next).version);
  assert.equal(draft.generatedBy.engine, 'rules-v1');
  assert.equal(draft.generatedBy.triggeredByRecordId, 't-tr-9');
  assert.equal(draft.generatedBy.manualEdited, false);
  assert.equal(draft.generatedBy.dataRange.counts.trainings, 9);
  assert.deepEqual(draft.generatedBy.history.at(-1).rules, ['R-GOAL']);
  assert.equal(draft.startDate, '2026-10-19');
  assert.equal(draft.endDate, '2026-11-15');
  // Same evidence version: regeneration is skipped, version stays 1.
  assert.equal(syncPlanDraft(state, next, { now }).reason, 'version-current');
  assert.equal(next.plans.find(p => p.id === PLAN_DRAFT_ID).version, 1);
  // New evidence: version 2, history grows, period follows the new timestamp.
  next.trainings.push(training('t-tr-10', '2026-10-17', 1000));
  const second = syncPlanDraft(state, next, { now: '2026-10-20T08:00:00.000Z', triggeredByRecordId: 't-tr-10' });
  assert.equal(second.changed, true);
  const updated = next.plans.find(p => p.id === PLAN_DRAFT_ID);
  assert.equal(updated.version, 2);
  assert.equal(updated.generatedBy.history.length, 2);
  assert.equal(updated.generatedBy.generatedAt, '2026-10-20T08:00:00.000Z');
  assert.equal(updated.startDate, '2026-10-20');
  assert.doesNotThrow(() => normalizeState(next));
});

test('手动编辑过的草稿不被自动覆盖，无成绩时草稿被移除', () => {
  const state = build({ swim: scores, trainings: currentTrainings });
  const next = structuredClone(state);
  next.trainings.push(training('t-tr-10', '2026-10-18', 1000));
  syncPlanDraft(state, next, { now });
  const draft = next.plans.find(p => p.id === PLAN_DRAFT_ID);
  assert.ok(draft);
  draft.generatedBy.manualEdited = true;
  const frozen = structuredClone(draft);
  next.trainings.push(training('t-tr-11', '2026-10-17', 1000));
  assert.equal(syncPlanDraft(state, next, { now }).reason, 'manual-edited');
  assert.deepEqual(next.plans.find(p => p.id === PLAN_DRAFT_ID), frozen);
  // Automatic (non-manual) drafts are removed once no score records remain.
  const base = build({ swim: scores, trainings: currentTrainings });
  const withDraft = structuredClone(base);
  withDraft.trainings.push(training('t-tr-12', '2026-10-18', 1000));
  syncPlanDraft(base, withDraft, { now });
  assert.ok(withDraft.plans.some(p => p.id === PLAN_DRAFT_ID));
  const scoreless = structuredClone(withDraft);
  scoreless.swim = [];
  const outcome = syncPlanDraft(next, scoreless, { now });
  assert.equal(outcome.changed, true);
  assert.equal(outcome.removed, true);
  assert.ok(!scoreless.plans.some(p => p.id === PLAN_DRAFT_ID));
});

test('仅档案字段变化不触发草稿，计划集合变化也不触发', () => {
  const state = build({ swim: scores, trainings: currentTrainings });
  const next = structuredClone(state);
  syncPlanDraft(state, next, { now });
  const withDraft = structuredClone(next);
  withDraft.profile = { ...withDraft.profile, name: '档案改名测试' };
  assert.equal(syncPlanDraft(withDraft, next, { now }).reason, 'evidence-unchanged');
  const withPlan = structuredClone(next);
  withPlan.plans.push({ id: 'manual-plan-1', title: '人工计划', startDate: '2026-10-19', endDate: '2026-10-25', focus: '人工重点', status: '草稿', reviewedBy: '', notes: '', version: 1, sessions: [] });
  assert.equal(syncPlanDraft(withPlan, next, { now }).reason, 'evidence-unchanged');
});

test('草稿槽位保持草稿状态，人工计划历史按计划封顶', () => {
  const data = { plans: [], planHistory: [] };
  const draftRecord = { id: PLAN_DRAFT_ID, status: '草稿', version: 1, generatedBy: { engine: 'rules-v1', evidenceVersion: '记录版本-test', generatedAt: now } };
  assert.ok(commitPlanUpdate(data, PLAN_DRAFT_ID, draftRecord, { ...draftRecord, status: '已确认' }).error);
  const edited = { ...draftRecord, focus: '家长手改重点' };
  assert.equal(commitPlanUpdate(data, PLAN_DRAFT_ID, draftRecord, edited).error, undefined);
  assert.equal(edited.generatedBy.manualEdited, true);
  assert.equal(data.planHistory.length, 0);
  for (let version = 1; version <= 25; version++) commitPlanUpdate(data, 'manual-plan', { id: 'manual-plan', version }, { id: 'manual-plan', version: version + 1, status: '草稿' });
  assert.equal(data.planHistory.length, 20);
  assert.equal(data.planHistory[0].version, 6);
  assert.equal(data.planHistory.at(-1).version, 25);
});

test('写入事务自动生成并更新计划草稿，恢复备份不追加新草稿', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-plan-'));
  fs.writeFileSync(path.join(directory, 'seed.json'), JSON.stringify(build({ swim: [score('t-seed-score', '2026-09-01', '00:40.00')] })));
  const store = openStore({ filename: path.join(directory, 'state.sqlite'), seedPath: path.join(directory, 'seed.json'), backupDir: path.join(directory, 'backups') });
  try {
    const first = store.read();
    store.change(first.revision, data => { const record = training('t-tr-store-1', '2026-10-18', 1000); data.trainings.push(record); return record; }, 'plan-test');
    const draft = store.read().data.plans.find(p => p.id === PLAN_DRAFT_ID);
    assert.ok(draft);
    assert.equal(draft.status, '草稿');
    assert.equal(draft.generatedBy.triggeredByRecordId, 't-tr-store-1');
    const second = store.read();
    store.change(second.revision, data => { const record = training('t-tr-store-2', '2026-10-19', 1000); data.trainings.push(record); return record; }, 'plan-test');
    assert.equal(store.read().data.plans.find(p => p.id === PLAN_DRAFT_ID).version, 2);
    const backup = store.read();
    store.change(backup.revision, data => { const record = training('t-tr-store-3', '2026-10-20', 1000); data.trainings.push(record); return record; }, 'plan-test');
    const withExtra = store.read();
    store.change(withExtra.revision, data => { for (const key of Object.keys(data)) delete data[key]; Object.assign(data, backup.data); return { success: true }; }, 'plan-test', { planSync: false });
    const restored = store.read().data;
    assert.deepEqual(restored.plans, backup.data.plans);
    assert.deepEqual(restored.trainings, backup.data.trainings);
    assert.ok(restored.trash.some(item => item.record.id === 't-tr-store-3'));
  } finally { store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
