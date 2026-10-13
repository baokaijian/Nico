import { derivePrdState } from '../shared/prd.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { COLLECTIONS, normalizeState } from '../shared/domain.mjs';
import { applyDeletionFlags, preserveDeletedRecords } from '../shared/deletion.mjs';

export class ConflictError extends Error { constructor() { super('记录已被其他设备更新，请刷新后核对并重试；当前输入已保留。'); this.status = 409; } }
export function atomicJSON(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const temporary = `${filename}.tmp`;
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'w', 0o600);
    fs.writeFileSync(descriptor, JSON.stringify(value, null, 2) + '\n');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor); descriptor = undefined;
    fs.renameSync(temporary, filename);
  } finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
}
export function openStore({ filename, seedPath, backupDir }) {
  fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  fs.chmodSync(filename, 0o600);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, revision INTEGER NOT NULL) STRICT;');
  if (!db.prepare('SELECT id FROM state WHERE id=1').get()) {
    try {
      const initial = normalizeState(JSON.parse(fs.readFileSync(seedPath, 'utf8')));
      atomicJSON(path.join(backupDir, 'original-import.json'), initial);
      db.prepare('INSERT INTO state(id,data,revision) VALUES (1, ?, 1)').run(JSON.stringify(initial));
    } catch (error) { db.close(); throw error; }
  }
  const columns = new Set(db.prepare('PRAGMA table_info(state)').all().map(column => column.name));
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!columns.has('is_deleted')) db.exec('ALTER TABLE state ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0,1)); ALTER TABLE state ADD COLUMN deleted_at TEXT; ALTER TABLE state ADD COLUMN deleted_by TEXT;');
    db.exec(`CREATE TABLE IF NOT EXISTS records (
      collection TEXT NOT NULL, record_id TEXT NOT NULL, payload TEXT NOT NULL, revision INTEGER NOT NULL,
      is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0,1)), deleted_at TEXT, deleted_by TEXT,
      PRIMARY KEY(collection,record_id),
      CHECK((is_deleted=1 AND deleted_at IS NOT NULL AND deleted_by IS NOT NULL) OR (is_deleted=0 AND deleted_at IS NULL AND deleted_by IS NULL))
    ) STRICT;
    CREATE INDEX IF NOT EXISTS records_deleted ON records(is_deleted,collection);
    CREATE TRIGGER IF NOT EXISTS state_no_delete BEFORE DELETE ON state BEGIN SELECT RAISE(ABORT,'逻辑删除保护：请保留原数据'); END;
    CREATE TRIGGER IF NOT EXISTS records_no_delete BEFORE DELETE ON records BEGIN SELECT RAISE(ABORT,'逻辑删除保护：请保留原数据'); END;`);
    const initial = read();
    syncRecords(initial.data, initial.revision, 'schema-backfill');
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); db.close(); throw error; }
  function syncRecords(data, revision, actor) {
    const time = new Date().toISOString();
    const active = new Set(COLLECTIONS.flatMap(key => data[key].map(record => `${key}/${record.id}`)));
    const deleted = db.prepare('UPDATE records SET is_deleted=1,deleted_at=?,deleted_by=?,revision=? WHERE collection=? AND record_id=? AND is_deleted=0');
    for (const row of db.prepare('SELECT collection,record_id FROM records WHERE is_deleted=0').all()) {
      if (!active.has(`${row.collection}/${row.record_id}`)) deleted.run(time, actor, revision, row.collection, row.record_id);
    }
    const upsertDeleted = db.prepare(`INSERT INTO records VALUES(?,?,?,?,1,?,?) ON CONFLICT(collection,record_id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,is_deleted=1,deleted_at=coalesce(records.deleted_at,excluded.deleted_at),deleted_by=coalesce(records.deleted_by,excluded.deleted_by)`);
    for (const item of data.trash) upsertDeleted.run(item.collection, item.record.id, JSON.stringify(item.record), revision, item.deletedAt || time, item.deletedBy || actor);
    const upsertActive = db.prepare(`INSERT INTO records VALUES(?,?,?,?,0,NULL,NULL) ON CONFLICT(collection,record_id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision,is_deleted=0,deleted_at=NULL,deleted_by=NULL`);
    for (const key of COLLECTIONS) for (const record of data[key]) upsertActive.run(key, record.id, JSON.stringify(record), revision);
  }
  function read() {
    const row = db.prepare(`SELECT data,revision,(SELECT coalesce(json_group_array(json_object(
      'collection',collection,'record_id',record_id,'payload',json(payload),
      'deleted_at',deleted_at,'deleted_by',deleted_by)),'[]') FROM records WHERE is_deleted=1) AS deleted
      FROM state WHERE id=1 AND is_deleted=0`).get();
    if (!row) throw new Error('事实库缺失，已停止写入');
    return { data: applyDeletionFlags(normalizeState(JSON.parse(row.data)), JSON.parse(row.deleted)), revision: row.revision };
  }
  function change(expectedRevision, mutate, actor = 'local-admin') {
    db.exec('BEGIN IMMEDIATE');
    try {
      const current = read();
      if (expectedRevision !== current.revision) throw new ConflictError();
      const next = structuredClone(current.data);
      const result = mutate(next);
      preserveDeletedRecords(current.data, next, actor, new Date().toISOString());
      derivePrdState(next);
      normalizeState(next);
      atomicJSON(path.join(backupDir, `revision-${current.revision}.json`), { ...current, format: 'nico-backup-v1' });
      db.prepare('UPDATE state SET data=?, revision=revision+1 WHERE id=1').run(JSON.stringify(next));
      syncRecords(next, current.revision + 1, actor);
      db.exec('COMMIT');
      return { result, revision: current.revision + 1 };
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return { read, change, close: () => db.close() };
}
