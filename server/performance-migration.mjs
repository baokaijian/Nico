import { normalizeState, COLLECTIONS } from '../shared/domain.mjs';
import { upgradePerformanceState } from '../shared/performance.ts';
import { derivePrdState } from '../shared/prd.mjs';
import { applyDeletionFlags } from '../shared/deletion.mjs';

export function inspectPerformanceMigration(snapshot) {
  if (!Number.isSafeInteger(snapshot?.revision) || snapshot.revision < 1) throw new Error('需要包含真实版本的完整快照');
  const before = applyDeletionFlags(normalizeState(structuredClone(snapshot.data)), snapshot.deleted_records || []);
  const upgraded = upgradePerformanceState(before);
  derivePrdState(upgraded.data);
  normalizeState(upgraded.data);
  // The migration owns score fields only, never media, publication or plans.
  for (const key of [...COLLECTIONS.filter(key => key !== 'swim'), 'profile', 'publishing', 'planHistory']) {
    if (JSON.stringify(before[key]) !== JSON.stringify(upgraded.data[key])) throw new Error(`迁移改变了非成绩内容：${key}`);
  }
  if (before.swim.length !== upgraded.data.swim.length || before.trash.length !== upgraded.data.trash.length) throw new Error('迁移不能增删业务记录');
  const corrections = [];
  const previous = [...before.swim, ...before.trash.filter(item => item.collection === 'swim').map(item => item.record)];
  const migrated = [...upgraded.data.swim, ...upgraded.data.trash.filter(item => item.collection === 'swim').map(item => item.record)];
  for (let index = 0; index < migrated.length; index++) for (const key of Object.keys(migrated[index])) {
    if (JSON.stringify(previous[index][key]) !== JSON.stringify(migrated[index][key])) corrections.push({ id: migrated[index].id, field: key });
  }
  return { ...upgraded, corrections, before, changed: JSON.stringify(before) !== JSON.stringify(upgraded.data), revision: snapshot.revision };
}
// All values are SQL literals, never executable fragments from athlete notes.
const jsonLiteral = data => `'${JSON.stringify(data).replace(/'/g, "''")}'::jsonb`;
export function performanceMigrationSQL(snapshot, inspected = inspectPerformanceMigration(snapshot)) {
  if (!inspected.changed) return { up: '', rollback: '' };
  const after = jsonLiteral(inspected.data), original = jsonLiteral(snapshot.data);
  const expected = inspected.revision;
  const deletedBefore = jsonLiteral((snapshot.deleted_records || []).map(item => ({ collection: item.collection, record_id: item.record_id, payload: item.payload })));
  const deletedAfter = jsonLiteral(inspected.data.trash.map(item => ({ collection: item.collection, record_id: item.record.id, payload: item.record })));
  const tombstones = "(SELECT coalesce(jsonb_agg(jsonb_build_object('collection',collection,'record_id',record_id,'payload',payload)),'[]'::jsonb) FROM public.nico_records WHERE is_deleted)";
  const block = (name, revision, source, target, deleted, actor) => {
    let tag = `$nico_performance_${name}$`, counter = 0;
    while ((after + original + deletedBefore + deletedAfter).includes(tag)) tag = `$nico_performance_${name}_${++counter}$`;
    return `DO ${tag}\nBEGIN\n  PERFORM set_config('lock_timeout','5s',true);\n  PERFORM 1 FROM public.nico_state WHERE id=1 AND revision=${revision} AND data=${source} FOR UPDATE;\n  IF NOT FOUND THEN RAISE EXCEPTION '记录已更新，禁止整库覆盖；请刷新并向前修复'; END IF;\n  PERFORM 1 FROM public.nico_records FOR UPDATE;\n  IF NOT (${tombstones} @> ${deleted} AND ${tombstones} <@ ${deleted}) THEN RAISE EXCEPTION '逻辑删除标记已更新，禁止覆盖'; END IF;\n  PERFORM public.nico_save_state(${revision}, ${target}, '${actor}');\nEND;\n${tag};\n`;
  };
  return {
    up: `-- Private data migration: checks revision, snapshot and tombstones; writes a backup.\nSET standard_conforming_strings = on;\n${block('upgrade', expected, original, after, deletedBefore, 'performance-ms-v1')}`,
    rollback: `-- Forward rollback refuses subsequent writes, snapshot edits or deletion changes.\nSET standard_conforming_strings = on;\n${block('rollback', expected + 1, after, original, deletedAfter, 'rollback-performance-ms-v1')}`,
  };
}
