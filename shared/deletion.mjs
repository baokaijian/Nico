import { COLLECTIONS } from './domain.mjs';

// Honor database tombstones even when a database administrator changes a flag
// directly. Read a consistent snapshot plus ledger in the same DB statement.
export function applyDeletionFlags(data, rows) {
  const deleted = new Map(rows.map(row => [`${row.collection}/${row.record_id}`, row]));
  for (const key of COLLECTIONS) data[key] = (data[key] === undefined ? [] : data[key]).filter(record => !deleted.has(`${key}/${record.id}`));
  const trash = new Map((data.trash || []).map(item => [`${item.collection}/${item.record.id}`, item]));
  for (const [key, row] of deleted) {
    if (!COLLECTIONS.includes(row.collection) || row.payload?.id !== row.record_id) throw new Error('删除记录索引与原内容不一致');
    if (!trash.has(key)) trash.set(key, { id: `ledger-${row.collection}-${row.record_id}`, collection: row.collection,
      record: row.payload, deletedAt: row.deleted_at, deletedBy: row.deleted_by });
  }
  data.trash = [...trash.values()];
  return data;
}

// A backup restore may omit newer records or an older recycle bin. Keep both
// recoverable rather than treating omission as permission to discard them.
export function preserveDeletedRecords(previous, next, actor, deletedAt) {
  const active = new Set(COLLECTIONS.flatMap(key => next[key].map(record => `${key}/${record.id}`)));
  const trash = new Map();
  for (const item of [...(previous.trash || []), ...(next.trash || [])]) {
    const key = `${item.collection}/${item.record.id}`;
    if (!active.has(key)) trash.set(key, { ...item, deletedBy: item.deletedBy || actor });
  }
  for (const collection of COLLECTIONS) for (const record of previous[collection]) {
    const key = `${collection}/${record.id}`;
    if (!active.has(key) && !trash.has(key)) trash.set(key, {
      id: `deleted-${collection}-${record.id}`, collection, record: structuredClone(record), deletedAt, deletedBy: actor,
    });
  }
  next.trash = [...trash.values()];
  return next;
}
