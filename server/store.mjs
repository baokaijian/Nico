import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { normalizeState } from '../shared/domain.mjs';

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
      db.prepare('INSERT INTO state VALUES (1, ?, 1)').run(JSON.stringify(initial));
    } catch (error) { db.close(); throw error; }
  }
  function read() {
    const row = db.prepare('SELECT data, revision FROM state WHERE id=1').get();
    if (!row) throw new Error('事实库缺失，已停止写入');
    return { data: normalizeState(JSON.parse(row.data)), revision: row.revision };
  }
  function change(expectedRevision, mutate) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const current = read();
      if (expectedRevision !== current.revision) throw new ConflictError();
      const next = structuredClone(current.data);
      const result = mutate(next);
      normalizeState(next);
      atomicJSON(path.join(backupDir, `revision-${current.revision}.json`), { ...current, format: 'nico-backup-v1' });
      db.prepare('UPDATE state SET data=?, revision=revision+1 WHERE id=1').run(JSON.stringify(next));
      db.exec('COMMIT');
      return { result, revision: current.revision + 1 };
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return { read, change, close: () => db.close() };
}
