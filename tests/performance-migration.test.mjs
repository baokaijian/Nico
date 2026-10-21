import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { emptyState, normalizeState } from '../shared/domain.mjs';
import { inspectPerformanceMigration, performanceMigrationSQL } from '../server/performance-migration.mjs';
import { openStore } from '../server/store.mjs';
import { upgradePrdState } from '../shared/prd.mjs';

const legacy = () => {
  const data = emptyState();
  data.swim = [{ id: 'protocol-legacy', date: '2000-01-01', distance: '50m', stroke: '自由泳', poolLength: '50m', time: '00:56:17', seconds: 56.17, notes: "家长原话 '); SELECT 1; -- $nico_performance_rollback$" }];
  data.media = [{ id: 'protocol-media', date: '2000-01-01', title: '协议素材', type: 'video', url: '/uploads/protocol.mp4', recordId: data.swim[0].id }];
  data.publishing = { swimIds: [data.swim[0].id], mediaIds: [], confirmedBy: '协议确认', confirmedAt: '2000-01-01', story: '' };
  return upgradePrdState(data).data;
};
test('迁移只补成绩字段，保留媒体、关联、公开选择和原始引号，SQL可安全转义', () => {
  const snapshot = { data: legacy(), revision: 3 }, original = structuredClone(snapshot);
  const inspected = inspectPerformanceMigration(snapshot);
  assert.equal(inspected.data.swim[0].timeMs, 56170);
  assert.deepEqual(inspected.data.media, snapshot.data.media);
  assert.deepEqual(inspected.data.publishing, snapshot.data.publishing);
  assert.equal(inspected.data.swim[0].notes, snapshot.data.swim[0].notes);
  assert.deepEqual(snapshot, original);
  const sql = performanceMigrationSQL(snapshot, inspected);
  assert.match(sql.up, /nico_save_state\(3,/);
  assert.ok(sql.up.includes("''"), '原话中的单引号按SQL字符串转义');
  assert.match(sql.rollback, /revision=4 AND data=/);
  assert.match(sql.rollback, /FOR UPDATE/);
  assert.match(sql.rollback, /DO \$nico_performance_rollback_1\$/);
  assert.equal(inspectPerformanceMigration({ data: inspected.data, revision: 4 }).changed, false);
  assert.deepEqual(performanceMigrationSQL({ data: inspected.data, revision: 4 }), { up: '', rollback: '' });
});
test('SQLite毫秒迁移先备份，CAS拒绝过期覆盖，原件字节不变且不凭空生成计划', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-ms-migration-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const seedPath = path.join(dir, 'original.json'), bytes = JSON.stringify(legacy()); fs.writeFileSync(seedPath, bytes);
  const store = openStore({ filename: path.join(dir, 'state.sqlite'), seedPath, backupDir: path.join(dir, 'backups') });
  try {
    const before = store.read(), inspected = inspectPerformanceMigration(before);
    store.change(before.revision, next => Object.assign(next, inspected.data), 'protocol-ms-migration', { planSync: false });
    const after = store.read();
    normalizeState(after.data); assert.equal(after.data.swim[0].timeMs, 56170);
    assert.deepEqual(after.data.plans, []); assert.equal(after.revision, before.revision + 1);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'backups', `revision-${before.revision}.json`))).data, before.data);
    assert.throws(() => store.change(before.revision, next => Object.assign(next, inspected.data)), /更新/);
    assert.deepEqual(store.read(), after); assert.equal(fs.readFileSync(seedPath, 'utf8'), bytes);
    assert.equal(inspectPerformanceMigration(after).changed, false);
  } finally { store.close(); }
});
