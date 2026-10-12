import { COLLECTIONS } from './domain.mjs';

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
