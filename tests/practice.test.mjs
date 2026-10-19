import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { emptyState, normalizeState, validateRecord } from '../shared/domain.mjs';
import { practiceOverview, growthTimeline, weakPointCandidates, HEATMAP_DAYS } from '../shared/practice.mjs';
import { planDimensions } from '../shared/plan-engine.mjs';
import { openStore } from '../server/store.mjs';
import { createApp } from '../server/server.js';
import { seedBytes, originalPath, hasPrivateInput } from './fixture.mjs';

// Fixed protocol cases only. Every value below is either entered by hand here or
// computed from it; nothing is invented by the engine.
const now = '2026-10-19T08:00:00.000Z';
const score = (id, date, time) => ({ id, date, time, distance: '50m', stroke: '自由泳', poolLength: '50m' });
const point = (id, extra = {}) => ({ id, date: '2026-10-01', title: '协议薄弱点', category: '技术动作', sourceType: '家长观察', sourceRef: '', evidence: '协议文本：仅用于校验', targetPerWeek: null, drillHint: '', status: '练习中', recordedBy: '协议', notes: '', ...extra });
const checkin = (id, weakPointId, date, times, extra = {}) => ({ id, date, weakPointId, times, durationMinutes: null, quality: '', childFeeling: '', notes: '', recordedBy: '协议', ...extra });
const build = overrides => { const state = emptyState(); Object.assign(state, overrides); return state; };

test('空库不产生薄弱点、打卡统计或成长结论', () => {
  const state = build({});
  const overview = practiceOverview(state, now);
  assert.deepEqual(overview.points, []);
  assert.deepEqual(overview.active, []);
  assert.deepEqual(overview.candidates, []);
  assert.equal(overview.weekTimes, 0);
  assert.equal(overview.weekTarget, 0);
  assert.equal(overview.streak.days, 0);
  assert.equal(overview.total, 0);
  assert.equal(overview.heatmap.length, HEATMAP_DAYS);
  assert.ok(overview.heatmap.every(day => day.times === 0));
  const growth = growthTimeline(state);
  assert.deepEqual(growth.projects, []);
  assert.equal(growth.height, null);
  assert.equal(growth.range.start, '');
  assert.equal(planDimensions(state, now).practice.active.length, 0);
});

test('打卡统计只汇总已录入记录：连续天数、本周次数、周目标、累计', () => {
  const state = build({
    weakpoints: [point('wp-1', { title: '转身蹬壁', status: '练习中', targetPerWeek: 5 }), point('wp-2', { title: '打腿节奏', status: '暂停' })],
    checkins: [checkin('ci-1', 'wp-1', '2026-10-17', 1), checkin('ci-2', 'wp-1', '2026-10-18', 2), checkin('ci-3', 'wp-1', '2026-10-19', 3), checkin('ci-4', 'wp-2', '2026-10-19', 4)],
  });
  const overview = practiceOverview(state, now);
  assert.equal(overview.week.start, '2026-10-19');
  assert.equal(overview.weekTimes, 3, '暂停的薄弱点不计入本周目标口径');
  assert.equal(overview.weekTarget, 5);
  assert.equal(overview.total, 4);
  assert.equal(overview.streak.days, 3);
  assert.equal(overview.streak.start, '2026-10-17');
  assert.equal(overview.streak.end, '2026-10-19');
  const first = overview.points.find(p => p.id === 'wp-1');
  assert.equal(first.times, 6);
  assert.equal(first.total, 3);
  assert.equal(first.weekTimes, 3);
  assert.equal(first.weekDays, 1);
  assert.equal(first.streak.days, 3);
  assert.equal(first.lastDate, '2026-10-19');
  assert.equal(overview.points.find(p => p.id === 'wp-2').weekTimes, 4, '逐条统计保留原值；暂停项只不计入上方周目标口径');
  assert.doesNotThrow(() => normalizeState(state));
});

test('连续打卡在中断后归零，未来的打卡不计入连续天数', () => {
  const base = { weakpoints: [point('wp-1', { status: '练习中' })] };
  const broken = build({ ...base, checkins: [checkin('ci-1', 'wp-1', '2026-10-10', 1), checkin('ci-2', 'wp-1', '2026-10-12', 1)] });
  assert.equal(practiceOverview(broken, now).streak.days, 0);
  const future = build({ ...base, checkins: [checkin('ci-1', 'wp-1', '2026-10-18', 1), checkin('ci-2', 'wp-1', '2026-10-25', 1)] });
  const overview = practiceOverview(future, now);
  assert.equal(overview.streak.days, 1);
  assert.equal(overview.streak.end, '2026-10-18');
});

test('候选薄弱点只引用已录入记录，确认后不再重复提示', () => {
  const trainings = [{ id: 't-tr-1', date: '2026-10-02', focusSkills: '转身后滑行太短', coachNotes: '教练原话：蹬壁再用力一点' }];
  const state = build({ trainings, swim: [score('t-score-1', '2026-09-01', '00:40.00'), score('t-score-2', '2026-09-20', '00:38.00'), score('t-score-3', '2026-10-10', '00:39.00')] });
  const candidates = weakPointCandidates(state);
  const feedback = candidates.find(c => c.sourceType === '教练反馈原话');
  assert.equal(feedback.title, '转身后滑行太短');
  assert.equal(feedback.sourceRef, 't-tr-1');
  assert.match(feedback.evidence, /教练原话/);
  const compared = candidates.find(c => c.sourceType === '成绩对比');
  assert.ok(compared, '同项目满3条且最近一次不是最好成绩时给出候选');
  assert.match(compared.evidence, /00:39\.00/);
  assert.equal(compared.sourceIds.length, 2);
  // Two records only: no score comparison candidate can be derived.
  assert.equal(weakPointCandidates(build({ swim: [score('t-score-1', '2026-09-01', '00:40.00'), score('t-score-2', '2026-09-20', '00:38.00')] })).filter(c => c.sourceType === '成绩对比').length, 0);
  const confirmed = build({ ...state, weakpoints: [point('wp-1', { title: '转身后滑行太短', sourceType: '教练反馈原话', sourceRef: 't-tr-1' })] });
  assert.equal(weakPointCandidates(confirmed).filter(c => c.sourceRef === 't-tr-1').length, 0);
});

test('能力成长只比较已录入的同一项目记录', () => {
  const state = build({
    swim: [score('t-score-1', '2026-09-01', '00:40.00'), score('t-score-2', '2026-09-20', '00:38.00'), score('t-score-3', '2026-10-10', '00:39.00'), { id: 't-score-25', date: '2026-09-05', distance: '25m', stroke: '自由泳', poolLength: '25m', time: '00:25.00' }],
    growth: [{ id: 'g-1', date: '2026-01-01', height: 130, weight: 28 }, { id: 'g-2', date: '2026-09-01', height: 134.5, weight: 30 }],
  });
  const growth = growthTimeline(state);
  assert.equal(growth.projects.length, 2);
  const main = growth.projects.find(p => p.key === '50m · 自由泳 · 50m');
  assert.equal(main.count, 3);
  assert.equal(main.improved.toFixed(2), '2.00');
  assert.equal(main.sinceLast.toFixed(2), '1.00');
  assert.equal(main.best.time, '00:38.00');
  assert.equal(growth.range.start, '2026-09-01');
  assert.equal(growth.height.delta, 4.5);
  assert.equal(growth.weight.delta, 2);
});

test('打卡与薄弱点字段校验：来源ID格式、次数范围、未知字段', () => {
  const strip = record => Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'id'));
  assert.throws(() => validateRecord('weakpoints', strip(point('wp-1', { sourceRef: '不 合法 ID' }))), /来源记录ID格式无效/);
  assert.throws(() => validateRecord('checkins', strip(checkin('ci-1', 'wp-1', '2026-10-19', 201))), /须在0–200范围内/);
  assert.throws(() => validateRecord('weakpoints', strip(point('wp-1', { unexpected: 1 }))), /不支持的字段/);
  assert.throws(() => validateRecord('checkins', { date: '2026-10-19', times: 1 }), /请填写薄弱点ID/);
  assert.equal(validateRecord('checkins', strip(checkin('ci-0', 'wp-1', '2026-10-19', 0))).times, 0, '未完成填0与留空不同');
  assert.equal(validateRecord('weakpoints', strip(point('wp-1', { sourceRef: 'swim-1,trainings-2' }))).sourceRef, 'swim-1,trainings-2');
});

test('计划草稿的打卡维度引用练习中的薄弱点，且不生成练习处方', () => {
  const state = build({ swim: [score('t-score-1', '2026-09-01', '00:40.00')], weakpoints: [point('wp-1', { title: '转身蹬壁', status: '练习中', targetPerWeek: 4 })], checkins: [checkin('ci-1', 'wp-1', '2026-10-19', 2)] });
  const practice = planDimensions(state, now).practice;
  assert.equal(practice.active.length, 1);
  assert.equal(practice.active[0].title, '转身蹬壁');
  assert.equal(practice.weekTimes, 2);
  assert.equal(practice.weekTarget, 4);
  assert.equal(practice.streakDays, 1);
  assert.deepEqual(practice.active[0].sets, undefined);
  const noCheckin = planDimensions(build({ swim: [score('t-score-1', '2026-09-01', '00:40.00')], weakpoints: [point('wp-1', { title: '转身蹬壁' })] }), now);
  assert.equal(noCheckin.practice.weekTimes, 0);
  assert.ok(noCheckin.rules.some(rule => rule.id === 'R-PRACTICE' && rule.triggered));
});

test('接口：薄弱点与打卡的关系校验、协作账号写入、带打卡的薄弱点禁止删除', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-practice-'));
  const seed = JSON.parse(seedBytes);
  // Old backups without the practice collections must still restore.
  delete seed.weakpoints; delete seed.checkins;
  fs.writeFileSync(path.join(directory, 'seed.json'), JSON.stringify(seed));
  const store = openStore({ filename: path.join(directory, 'state.sqlite'), seedPath: path.join(directory, 'seed.json'), backupDir: path.join(directory, 'backups') });
  const owner = 'owner-test-only-not-a-live-secret-123456';
  const coach = 'coach-test-only-not-a-live-secret-123456';
  const server = createApp({ store, uploadsDir: path.join(directory, 'uploads'), releaseDir: path.join(directory, 'release'), authRequired: true, tokens: { owner, coach, viewer: 'viewer-test-only-not-a-live-secret-123456' }, processUploads: false }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.close(); fs.rmSync(directory, { recursive: true, force: true }); if (hasPrivateInput) assert.deepEqual(fs.readFileSync(originalPath), seedBytes); });
  assert.deepEqual(store.read().data.weakpoints, []);
  const base = `http://127.0.0.1:${server.address().port}`;
  let rev = store.read().revision;
  const request = async (url, method = 'GET', body, token = owner) => {
    const response = await fetch(base + url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'If-Match': String(rev) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const next = response.headers.get('X-Nico-Revision'); if (next) rev = Number(next);
    return { status: response.status, data: await response.json().catch(() => ({})) };
  };
  const created = await request('/api/weakpoints', 'POST', { date: '2026-10-01', title: '协议薄弱点A', category: '技术动作', sourceType: '家长观察', sourceRef: '', evidence: '协议文本', targetPerWeek: '', drillHint: '', status: '练习中', recordedBy: '协议', notes: '' }, coach);
  assert.equal(created.status, 201);
  assert.equal((await request('/api/checkins', 'POST', { date: '2026-10-02', weakPointId: 'weakpoints-不存在', times: 1 })).status, 400);
  const saved = await request('/api/checkins', 'POST', { date: '2026-10-02', weakPointId: created.data.id, times: 2, durationMinutes: '', quality: '按要求完成', childFeeling: '', notes: '', recordedBy: '协议' });
  assert.equal(saved.status, 201);
  assert.equal((await request(`/api/weakpoints/${created.data.id}`, 'DELETE')).status, 409);
  assert.equal((await request(`/api/checkins/${saved.data.id}`, 'DELETE')).status, 200);
  assert.equal((await request(`/api/weakpoints/${created.data.id}`, 'DELETE')).status, 200);
  const backup = await request('/api/backup');
  assert.equal(backup.status, 200);
  assert.ok(Array.isArray(backup.data.data.checkins));
});
