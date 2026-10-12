import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openStore } from '../server/store.mjs';
import { normalizeState } from '../shared/domain.mjs';
import { preserveDeletedRecords } from '../shared/deletion.mjs';
import { seedBytes, raw } from './fixture.mjs';

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
