import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { emptyState, normalizeState } from '../shared/domain.mjs';
import { inspectPerformanceMigration, performanceMigrationSQL, commitPerformanceMigration } from '../server/performance-migration.mjs';
import { DatabaseSync } from 'node:sqlite';
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
    commitPerformanceMigration(store, inspected);
    const after = store.read();
    normalizeState(after.data); assert.equal(after.data.swim[0].timeMs, 56170);
    assert.deepEqual(after.data.plans, []); assert.equal(after.revision, before.revision + 1);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'backups', `revision-${before.revision}.json`))).data, before.data);
    assert.throws(() => store.change(before.revision, next => Object.assign(next, inspected.data)), /更新/);
    assert.deepEqual(store.read(), after); assert.equal(fs.readFileSync(seedPath, 'utf8'), bytes);
    assert.equal(inspectPerformanceMigration(after).changed, false);
  } finally { store.close(); }
});
test('本机迁移拒绝未递增版本的外部逻辑删除变化，不复活已删记录', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-ms-race-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const seed = path.join(dir, 'seed.json'), filename = path.join(dir, 'state.sqlite'); fs.writeFileSync(seed, JSON.stringify(legacy()));
  const store = openStore({ filename, seedPath: seed, backupDir: path.join(dir, 'backups') });
  try {
    const before = store.read(), inspected = inspectPerformanceMigration(before);
    const external = new DatabaseSync(filename);
    external.prepare("UPDATE records SET is_deleted=1,deleted_at=?,deleted_by=? WHERE collection='swim' AND record_id='protocol-legacy'").run('2000-01-02T00:00:00Z', 'protocol-manual');
    external.close();
    const deleted = store.read(); assert.equal(deleted.revision, before.revision);
    assert.throws(() => commitPerformanceMigration(store, inspected), /删除标记已改变/);
    assert.deepEqual(store.read(), deleted); assert.equal(store.read().data.swim.length, 0);
    assert.ok(store.read().data.trash.some(item => item.record.id === 'protocol-legacy'));
  } finally { store.close(); }
});
test('云端向前回滚使用原有逻辑删除视图，不能从原始快照复活隐藏记录', () => {
  const data = legacy(), score = structuredClone(data.swim[0]);
  const snapshot = { data, revision: 3, deleted_records: [{ collection: 'swim', record_id: score.id, payload: score, deleted_at: '2000-01-02T00:00:00Z', deleted_by: 'protocol-parent' }] };
  const sql = performanceMigrationSQL(snapshot);
  const call = sql.rollback.slice(sql.rollback.lastIndexOf('PERFORM public.nico_save_state'));
  const literal = call.match(/'((?:''|[^'])*)'::jsonb/)[1];
  const target = JSON.parse(literal.replace(/''/g, "'"));
  assert.equal(target.swim.length, 0);
  assert.equal(target.trash[0].record.id, score.id);
  assert.equal(target.trash[0].deletedBy, 'protocol-parent');
  assert.match(sql.up, /逻辑删除标记已更新/);
  assert.match(sql.up, /public.nico_records FOR UPDATE/);
});
