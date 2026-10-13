import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { COLLECTIONS, normalizeState, publicSnapshot } from '../shared/domain.mjs';
import { auditPrdState, upgradePrdState, validatePrdState } from '../shared/prd.mjs';
import { applyDeletionFlags } from '../shared/deletion.mjs';
import { atomicJSON, openStore } from '../server/store.mjs';
import { validatePublicSummary } from '../shared/publication.mjs';
const args = process.argv.slice(2);
const option = key => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
const root = path.resolve(import.meta.dirname, '..');
const reportPath = path.resolve(option('--report') || path.join(root, 'review/prd-data-audit.json'));
const inputPath = option('--input');
const apply = args.includes('--apply-local');
if (apply && inputPath) throw new Error('外部导出不允许覆盖本地事实库；请分别检查');
function digest(filename) { return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'); }
function privateOutput(filename, value) {
  const destination = path.resolve(filename);
  const privateRoot = path.join(root, 'review') + path.sep;
  if (!destination.startsWith(privateRoot)) throw new Error('含私有数据的审计 / SQL文件必须保存到已忽略的review目录');
  atomicJSON(destination, value);
}
function inspect(data) {
  const normalized = normalizeState(data);
  const upgrade = upgradePrdState(normalized);
  normalizeState(upgrade.data); validatePrdState(upgrade.data);
  return { before: auditPrdState(normalized), after: auditPrdState(upgrade.data), ...upgrade };
}
const filename = path.join(root, 'data/nico.sqlite');
let current;
if (inputPath) {
  const imported = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Number.isInteger(imported.revision) || !imported.data) throw new Error('需要包含data与revision的最新完整导出');
  current = imported;
} else {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const row = db.prepare('SELECT data,revision FROM state WHERE id=1 AND is_deleted=0').get();
    if (!row) throw new Error('本地事实库缺失');
    const deleted = db.prepare('SELECT collection,record_id,payload,deleted_at,deleted_by FROM records WHERE is_deleted=1').all().map(r => ({ ...r, payload: JSON.parse(r.payload) }));
    current = { data: applyDeletionFlags(JSON.parse(row.data), deleted), revision: row.revision };
  } finally { db.close(); }
}
if (args.includes('--update-release') && (!apply || inputPath)) throw new Error('公开包更新仅限明确授权的本地整改，禁止直接使用外部快照');
if (!reportPath.startsWith(path.join(root, 'review') + path.sep)) throw new Error('审计报告必须保存到review目录');
const inspected = inspect(current.data);
const inventory = [];
// Source and historical backups are immutable evidence. Audit upgrade compatibility without overwriting them.
for (const entry of ['data/original-input.json', ...fs.readdirSync(path.join(root, 'data/backups')).filter(n => n.endsWith('.json')).map(n => `data/backups/${n}`)]) {
  try {
    const location = path.join(root, entry), source = JSON.parse(fs.readFileSync(location, 'utf8'));
    const result = inspect(source.data || source);
    inventory.push({ file: entry, sha256: digest(location), counts: result.after.counts, correctionsNeeded: result.corrections.length, missingInformation: result.after.issues.length });
  } catch (error) { inventory.push({ file: entry, error: error.message }); }
}
// Also inspect every retained SQLite snapshot without changing its bytes.
for (const name of fs.readdirSync(path.join(root, 'data')).filter(n => n.endsWith('.sqlite') && n !== 'nico.sqlite')) {
  const location = path.join(root, 'data', name);
  const db = new DatabaseSync(location, { readOnly: true });
  try {
    const row = db.prepare('SELECT data,revision FROM state WHERE id=1').get();
    const result = inspect(JSON.parse(row.data));
    inventory.push({ file: `data/${name}`, revision: row.revision, sha256: digest(location), counts: result.after.counts, correctionsNeeded: result.corrections.length, missingInformation: result.after.issues.length });
  } catch (error) { inventory.push({ file: `data/${name}`, error: error.message }); }
  finally { db.close(); }
}
const mediaFiles = [];
for (const item of [...current.data.media, ...(current.data.trash || []).filter(t => t.collection === 'media').map(t => t.record)]) for (const key of ['url', 'playbackUrl', 'posterUrl']) {
  if (!item[key]) continue;
  if (!/^\/uploads\/[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(item[key])) throw new Error('素材路径无效');
  const local = path.join(root, 'data/uploads', item[key].slice(9));
  mediaFiles.push({ id: item.id, kind: key, url: item[key], existsLocally: fs.existsSync(local), sha256: fs.existsSync(local) ? digest(local) : null });
}
const released = validatePublicSummary(JSON.parse(fs.readFileSync(path.join(root, 'release/public-summary.json'), 'utf8')));
let revision = current.revision;
if (apply && JSON.stringify(inspected.data) !== JSON.stringify(current.data)) {
  const store = openStore({ filename, seedPath: path.join(root, 'data/original-input.json'), backupDir: path.join(root, 'data/backups') });
  try {
    const saved = store.change(current.revision, next => { for (const key of Object.keys(next)) delete next[key]; Object.assign(next, inspected.data); }, 'prd-data-migration');
    revision = saved.revision;
    const verified = store.read();
    if (JSON.stringify(verified.data) !== JSON.stringify(inspected.data)) throw new Error('整改后的事实库与审计结果不一致');
    const db = new DatabaseSync(filename, { readOnly: true });
    try {
      for (const key of COLLECTIONS) for (const record of verified.data[key]) {
        const row = db.prepare('SELECT payload,is_deleted FROM records WHERE collection=? AND record_id=?').get(key, record.id);
        if (!row || row.is_deleted || JSON.stringify(JSON.parse(row.payload)) !== JSON.stringify(record)) throw new Error('逐条记录与事实库不一致');
      }
    } finally { db.close(); }
  } finally { store.close(); }
}
if (args.includes('--update-release')) {
  // Keep exactly the already approved publication whitelist and media; only format existing times.
  const wanted = publicSnapshot(inspected.data);
  for (const key of ['swim', 'media']) if (JSON.stringify(wanted[key].map(r => r.id).sort()) !== JSON.stringify(released[key].map(r => r.id).sort())) throw new Error('当前白名单与既有发布包不同，禁止自动扩大或缩小公开范围');
  if (wanted.publishedAt !== released.publishedAt || wanted.story !== released.story) throw new Error('公开确认信息变动，请先人工核对');
  validatePublicSummary(wanted);
  atomicJSON(path.join(root, 'release/public-summary.json'), wanted);
}
if (option('--cloud-sql')) {
  if (!inputPath) throw new Error('云端整改必须依据云端的最新导出，禁止用本地旧数据替代');
  const output = path.resolve(option('--cloud-sql'));
  if (!output.startsWith(path.join(root, 'review') + path.sep)) throw new Error('云端SQL包含私有数据，必须保存到review目录');
  const payload = JSON.stringify(inspected.data).replaceAll("'", "''");
  fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });
  fs.writeFileSync(output, `begin;\nselect public.nico_save_state(${current.revision}, '${payload}'::jsonb, 'prd-data-migration');\ncommit;\n`, { mode: 0o600 });
}
const report = { generatedAt: new Date().toISOString(), scope: inputPath ? 'imported-snapshot-only' : 'local-current-and-history', cloud: { checked: false, reason: '需要通过已授权连接读取最新云端数据，历史导出不证明云端当前状态' }, revisionBefore: current.revision, revisionAfter: revision, originalSha256: digest(path.join(root, 'data/original-input.json')), inventory, mediaFiles, publicCounts: { swim: released.swim.length, media: released.media.length }, ...inspected };
privateOutput(reportPath, report);
console.log(JSON.stringify({ scope: report.scope, revisionBefore: report.revisionBefore, revisionAfter: revision, counts: inspected.after.counts, corrections: inspected.corrections.length, missingInformation: inspected.after.issues.length, historicalFiles: inventory.length, historicalErrors: inventory.filter(i => i.error).length, mediaFiles: mediaFiles.length, missingLocalMedia: mediaFiles.filter(f => !f.existsLocally).length, report: reportPath }));
if (inventory.some(i => i.error)) process.exitCode = 1;
