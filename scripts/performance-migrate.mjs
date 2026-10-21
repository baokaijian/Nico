import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { inspectPerformanceMigration, performanceMigrationSQL } from '../server/performance-migration.mjs';
import { openStore, atomicJSON } from '../server/store.mjs';

const args = process.argv.slice(2), root = path.resolve(import.meta.dirname, '..');
const option = key => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
const imported = option('--input');
if (args.includes('--apply-local') && imported) throw new Error('导入快照只能审计和生成SQL，不能覆盖本机事实库');
const filename = path.join(root, 'data/nico.sqlite');
let snapshot;
if (imported) snapshot = JSON.parse(fs.readFileSync(path.resolve(imported), 'utf8'));
else {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const row = db.prepare('SELECT data,revision FROM state WHERE id=1 AND is_deleted=0').get();
    if (!row) throw new Error('本机事实库不存在，禁止初始化空库替代');
    const deleted_records = db.prepare('SELECT collection,record_id,payload,deleted_at,deleted_by FROM records WHERE is_deleted=1').all().map(item => ({ ...item, payload: JSON.parse(item.payload) }));
    snapshot = { data: JSON.parse(row.data), revision: row.revision, deleted_records };
  } finally { db.close(); }
}
const inspected = inspectPerformanceMigration(snapshot);
const base = path.join(root, 'review', `performance-ms-${snapshot.revision}-${Date.now()}`);
atomicJSON(`${base}-before.json`, snapshot);
atomicJSON(`${base}-after.json`, { data: inspected.data, revision: inspected.revision, corrections: inspected.corrections });
let savedRevision = snapshot.revision;
if (args.includes('--apply-local') && inspected.changed) {
  const store = openStore({ filename, seedPath: path.join(root, 'data/original-input.json'), backupDir: path.join(root, 'data/backups') });
  try {
    const saved = store.change(snapshot.revision, data => { for (const key of Object.keys(data)) delete data[key]; Object.assign(data, inspected.data); return { migrated: true }; }, 'performance-ms-v1', { planSync: false });
    savedRevision = saved.revision;
  } finally { store.close(); }
}
if (args.includes('--cloud-sql')) {
  if (!imported) throw new Error('云端SQL必须使用云端最新导出，不能拿本机副本覆盖云端');
  const sql = performanceMigrationSQL(snapshot, inspected);
  fs.writeFileSync(`${base}-apply.sql`, sql.up, { mode: 0o600 });
  fs.writeFileSync(`${base}-rollback.sql`, sql.rollback, { mode: 0o600 });
}
console.log(JSON.stringify({ changed: inspected.changed, scoreCount: inspected.data.swim.length, corrections: inspected.corrections.length, revision: savedRevision, artifactPrefix: path.relative(root, base), appliedLocally: args.includes('--apply-local') && inspected.changed }));
