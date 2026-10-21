import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../server/store.mjs';
import { normalizeState, publicSnapshot } from '../shared/domain.mjs';
import { applyDeletionFlags, preserveDeletedRecords } from '../shared/deletion.mjs';
import { seedBytes, raw } from './fixture.mjs';

test('云端旧九集合快照无需写回即可读取，新增集合按空状态兼容', () => {
  const legacy = normalizeState(structuredClone(raw));
  delete legacy.weakpoints; delete legacy.checkins;
  const original = JSON.stringify(legacy);
  const result = applyDeletionFlags(structuredClone(legacy), []);
  assert.deepEqual(result.weakpoints, []); assert.deepEqual(result.checkins, []);
  assert.deepEqual(result.swim, legacy.swim);
  assert.equal(JSON.stringify(legacy), original, '读取不改原始快照');
  assert.throws(() => applyDeletionFlags({ ...legacy, weakpoints: null }, []), '损坏集合不能被空数据掩盖');
});

test('旧SQLite无损迁移，逐条逻辑删除/恢复、回滚冲突和禁止物理删除', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-soft-delete-'));
  const filename = path.join(directory, 'state.sqlite'), seedPath = path.join(directory, 'seed.json');
  fs.writeFileSync(seedPath, seedBytes);
  const data = normalizeState(raw), original = data.swim[0];
  const legacy = new DatabaseSync(filename);
  legacy.exec('CREATE TABLE state(id INTEGER PRIMARY KEY,data TEXT,revision INTEGER) STRICT');
  legacy.prepare('INSERT INTO state VALUES(1,?,8)').run(JSON.stringify(data)); legacy.close();
  let store = openStore({ filename, seedPath, backupDir: path.join(directory, 'backups') });
  const inspect = new DatabaseSync(filename);
  t.after(() => { inspect.close(); store.close(); fs.rmSync(directory, { recursive: true, force: true }); });
  assert.deepEqual(store.read(), { data, revision: 8 });
  const row = () => inspect.prepare('SELECT * FROM records WHERE collection=? AND record_id=?').get('swim', original.id);
  assert.equal(row().is_deleted, 0); assert.deepEqual(JSON.parse(row().payload), original);
  store.change(8, next => { next.swim = next.swim.filter(item => item.id !== original.id); }, 'admin');
  assert.equal(row().is_deleted, 1); assert.ok(row().deleted_at); assert.equal(row().deleted_by, 'admin');
  assert.deepEqual(JSON.parse(row().payload), original);
  assert.ok(!store.read().data.swim.some(item => item.id === original.id));
  assert.deepEqual(store.read().data.trash[0].record, original);
  const deletedRow = row();
  assert.throws(() => store.change(8, next => next.swim.push(original)), /更新/);
  assert.deepEqual(row(), deletedRow);
  // Restoring an older backup must not clear a newer recycle bin.
  store.change(9, next => { next.trash = []; }, 'admin');
  assert.deepEqual(store.read().data.trash[0].record, original);
  store.change(10, next => { const [item] = next.trash.splice(0, 1); next.swim.push(item.record); }, 'admin');
  assert.equal(row().is_deleted, 0); assert.equal(row().deleted_at, null); assert.equal(row().deleted_by, null);
  assert.deepEqual(JSON.parse(row().payload), original); assert.equal(store.read().data.trash.length, 0);
  assert.throws(() => inspect.prepare('DELETE FROM records WHERE record_id=?').run(original.id), /逻辑删除保护/);
  assert.throws(() => inspect.exec('DELETE FROM state'), /逻辑删除保护/);
  store.close(); store = openStore({ filename, seedPath, backupDir: path.join(directory, 'backups') });
  assert.equal(store.read().revision, 11); assert.deepEqual(JSON.parse(row().payload), original);
  inspect.prepare('UPDATE records SET is_deleted=1,deleted_at=?,deleted_by=? WHERE collection=? AND record_id=?').run('2026-10-12T00:00:00Z','database-admin','swim',original.id);
  assert.ok(!store.read().data.swim.some(item => item.id === original.id));
  const tombstone = store.read().data.trash.find(item => item.record.id === original.id);
  assert.deepEqual(tombstone.record, original); assert.equal(tombstone.deletedBy, 'database-admin');
  store.change(11, next => { next.swim.push(tombstone.record); next.trash = []; }, 'admin');
  assert.equal(row().is_deleted, 0); assert.deepEqual(JSON.parse(row().payload), original);
});

test('直接数据库删除标记也会隐藏公开内容并保留可恢复的完整原记录', () => {
  const original = normalizeState(structuredClone(raw));
  const score = original.swim[0], video = original.media[0];
  original.publishing.swimIds = [score.id]; original.publishing.mediaIds = [video.id];
  const before = structuredClone(original);
  const effective = applyDeletionFlags(structuredClone(original), [
    { collection: 'swim', record_id: score.id, payload: score, deleted_at: '2026-10-12T00:00:00Z', deleted_by: 'admin' },
    { collection: 'media', record_id: video.id, payload: video, deleted_at: '2026-10-12T00:00:00Z', deleted_by: 'admin' },
  ]);
  assert.equal(publicSnapshot(effective).swim.length, 0); assert.equal(publicSnapshot(effective).media.length, 0);
  assert.deepEqual(effective.trash.map(item => item.record), [score, video]); assert.deepEqual(original, before);
});

test('备份恢复不会丢弃较新记录，已有回收记录保留删除人和原时间', () => {
  const previous = normalizeState(structuredClone(raw)), next = structuredClone(previous);
  const original = previous.media[0]; next.media = next.media.slice(1);
  preserveDeletedRecords(previous, next, 'admin', '2026-10-12T00:00:00Z');
  assert.deepEqual(next.trash[0].record, original);
  const again = structuredClone(next); again.trash = [];
  preserveDeletedRecords(next, again, 'another-admin', '2026-10-13T00:00:00Z');
  assert.deepEqual(again.trash, next.trash);
});
