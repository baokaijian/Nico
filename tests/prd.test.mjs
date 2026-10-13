import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeState, validateRecord, publicSnapshot } from '../shared/domain.mjs';
import { raw } from './fixture.mjs';
import { parseScore, scoreFormat, dateFormat, bodyFormat, upgradePrdState, derivePrdState, validatePrdState, auditPrdState } from '../shared/prd.mjs';
import { openStore } from '../server/store.mjs';
const score = { date: '2026-10-13', distance: '50m', stroke: '自由泳', poolLength: '50m', time: '56.17' };
test('PRD百分秒严格解析，旧格式兼容且零差距有效', () => {
  for (const value of ['56.17', '00:56.17', '00:56:17']) assert.equal(parseScore(value), 56.17);
  assert.equal(scoreFormat(74), '01:14:00'); assert.equal(scoreFormat(0), '00:00:00');
  assert.equal(parseScore('00:00:00'), null); assert.equal(parseScore('00:00:00', true), 0);
  for (const value of ['00:60:00', '00:30:100', '1:2:3', 'NaN', '-3', '0', '90000']) assert.equal(parseScore(value), null);
  assert.equal(validateRecord('swim', score).time, '00:56:17');
  assert.equal(dateFormat('2026-10-13'), '2026年10月13日'); assert.equal(bodyFormat(28), '28.0');
});
test('固定项目和距离、整数排名、决赛状态、一位小数和第一名成绩拒绝矛盾数据', () => {
  for (const invalid of [{ distance: '37m' }, { poolLength: '30m' }, { testItem: '自填项目' }, { testItem: '抱板打腿' }, { rank: 0 }, { lane: 1.5 }, { isFinal: false, preliminaryRank: 2 }, { winnerTime: '57' }, { rank: 1, winnerTime: '50' }]) assert.throws(() => validateRecord('swim', { ...score, ...invalid }));
  assert.equal(validateRecord('swim', { ...score, stroke: '打腿', testItem: '抱板打腿', poolLength: '其他', isFinal: true, preliminaryRank: 2 }).preliminaryRank, 2);
  assert.throws(() => validateRecord('growth', { date: score.date, weight: 27.77 }), /一位/);
  assert.equal(validateRecord('growth', { date: score.date, weight: 27.8, sitAndReach: -1.5 }).weight, 27.8);
});
test('整改可重复执行，保留原始值、未知信息、删除记录和未相关资料，不把臂展冒充臂长', () => {
  const before = normalizeState(raw), original = structuredClone(before);
  before.growth[0].weight = 27.77;
  const migrated = upgradePrdState(before);
  assert.equal(migrated.data.growth[0].weight, 27.8); assert.equal(migrated.data.growth[0].legacyValues.weight, 27.77);
  assert.equal(migrated.data.growth[0].armLength, null); assert.equal(migrated.data.growth[0].armSpan, before.growth[0].armSpan ?? null);
  assert.equal(migrated.data.profile.birthDate, ''); assert.equal(migrated.data.profile.sex, '');
  assert.deepEqual(migrated.data.goals, original.goals); assert.deepEqual(migrated.data.trainings, []);
  for (const r of migrated.data.swim) assert.equal(r.seconds, original.swim.find(s => s.id === r.id).seconds);
  normalizeState(migrated.data); validatePrdState(migrated.data);
  assert.deepEqual(upgradePrdState(migrated.data).data, migrated.data); assert.deepEqual(upgradePrdState(migrated.data).corrections, []);
  assert.ok(auditPrdState(migrated.data).issues.some(i => i.field === 'birthDate'));
  assert.equal(before.growth[0].weight, 27.77);
  const deleted = structuredClone(migrated.data); deleted.trash.push({ collection: 'swim', record: deleted.swim.pop(), id: 'test-trash', deletedAt: '2026-10-13T00:00:00Z', deletedBy: 'test' });
  assert.deepEqual(upgradePrdState(deleted).data.trash, deleted.trash);
});
test('年龄按测试年份计算，排名差距与已确认媒体关联计算，日期相同不能猜测关联', () => {
  const base = normalizeState({ ...raw, swim: [{ ...score, id: 'prd-score', time: '00:56:17', seconds: 56.17, recordType: '测试', winnerTime: '00:56:17', notes: '' }], media: [{ id: 'prd-media', date: score.date, title: '测试影像', type: 'video', url: '/uploads/test.mp4' }] });
  const state = upgradePrdState(base).data;
  assert.equal(state.swim[0].testAgeGroup, null); assert.equal(state.swim[0].gapTime, '00:00:00'); assert.deepEqual(state.swim[0].mediaIds, []);
  state.profile.birthDate = '2020-12-31'; state.media[0].recordId = 'prd-score'; derivePrdState(state);
  assert.equal(state.swim[0].testAgeGroup, 6); assert.deepEqual(state.swim[0].mediaIds, ['prd-media']);
  state.swim[0].recordType = '比赛'; state.swim[0].ageGroup = '9-10岁组'; derivePrdState(state); assert.equal(state.swim[0].testAgeGroup, null); assert.equal(state.swim[0].ageGroup, '9-10岁组');
  state.swim[0].gapTime = '00:01:00'; assert.throws(() => normalizeState(state), /派生数据/);
});
test('整改写入同一事实库并同步逻辑删除台账，旧版本备份和CAS保护，公开范围不增加', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-prd-'));
  const seed = path.join(dir, 'seed.json'); fs.writeFileSync(seed, JSON.stringify(raw));
  const store = openStore({ filename: path.join(dir, 'db.sqlite'), seedPath: seed, backupDir: path.join(dir, 'backups') });
  try {
    const before = store.read(); const upgrade = upgradePrdState(before.data);
    const saved = store.change(before.revision, next => Object.assign(next, upgrade.data), 'test-migration');
    assert.equal(saved.revision, before.revision + 1); assert.deepEqual(store.read().data, upgrade.data);
    const backup = JSON.parse(fs.readFileSync(path.join(dir, 'backups', `revision-${before.revision}.json`))); assert.deepEqual(backup.data, before.data);
    assert.throws(() => store.change(before.revision, next => Object.assign(next, upgrade.data)), /更新/);
    assert.deepEqual(publicSnapshot(upgrade.data), publicSnapshot(before.data));
  } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('已整改数据通过云端写入、匿名只读、关联计算、回收恢复和旧备份恢复', async () => {
  const { createCloudHandler } = await import('../server/cloud-api.mjs');
  let current = { data: upgradePrdState(normalizeState(raw)).data, revision: 30 };
  const token = 'b'.repeat(64), backups = [];
  const handler = createCloudHandler({ origins: [], backend: {
    read: async () => structuredClone(current), session: async () => ({ username: 'protocol-admin', expires_at: new Date(Date.now() + 60000).toISOString() }), account: async () => ({ must_change_password: false }),
    save: async (revision, data) => { assert.equal(revision, current.revision); backups.push(structuredClone(current)); current = { data, revision: revision + 1 }; return current.revision; },
  } });
  const request = (url, method, body, credential = token) => handler(new Request(`https://protocol.invalid/nico-api${url}`, { method, headers: { 'Content-Type': 'application/json', 'If-Match': String(current.revision), ...(credential ? { Authorization: `Bearer ${credential}` } : {}) }, body: body ? JSON.stringify(body) : undefined }));
  assert.equal((await request('/api/swim', 'POST', score, '')).status, 401);
  const created = await request('/api/swim', 'POST', { ...score, winnerTime: '50.17', recordType: '测试' }); assert.equal(created.status, 201);
  const saved = await created.json(); assert.equal(saved.gapTime, '00:06:00'); assert.equal(saved.time, '00:56:17');
  assert.equal((await request('/api/profile', 'PUT', { name: 'Test only', sex: '其他', birthDate: '2020-12-31' })).status, 200);
  assert.equal(current.data.swim.find(r => r.id === saved.id).testAgeGroup, 6);
  assert.equal((await request('/api/media/' + raw.media[0].id, 'PUT', { recordId: saved.id })).status, 200);
  assert.deepEqual(current.data.swim.find(r => r.id === saved.id).mediaIds, [raw.media[0].id]);
  assert.equal((await request(`/api/swim/${saved.id}`, 'DELETE')).status, 200);
  const removed = current.data.trash.find(t => t.record.id === saved.id); assert.ok(removed);
  assert.equal((await request(`/api/trash/${removed.id}/restore`, 'POST', {})).status, 200); normalizeState(current.data);
  assert.equal((await request('/api/swim', 'POST', { ...score, rank: 1, winnerTime: '50' })).status, 400);
  assert.equal((await request('/api/restore', 'POST', { format: 'nico-backup-v1', data: normalizeState(raw) })).status, 200);
  assert.equal(current.data.schemaVersion, 2); assert.ok(current.data.trash.some(t => t.record.id === saved.id)); normalizeState(current.data);
  assert.ok(backups.length >= 6);
});
