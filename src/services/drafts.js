// 本机草稿不上传；身份来自已验证会话，过期和旧草稿均不自动认领/删除。
export const DRAFT_TTL_MS = 7 * 86400000;
const prefix = 'nico.draft.v2:';
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// Partial inputs are valid drafts; malformed nested controls must never be restored.
export const validGrowthDraft = value => plain(value) && plain(value.values) &&
  (value.editing == null || typeof value.editing === 'string') && (value.baseRevision == null || Number.isSafeInteger(value.baseRevision)) && typeof value.clientRequestId === 'string' &&
  Object.entries(value.values).every(([key, item]) => {
    if (['evidenceRefs', 'baselineRefs'].includes(key)) return Array.isArray(item) && item.every(ref => plain(ref) && typeof ref.collection === 'string' && typeof ref.id === 'string');
    if (['checkinIds', 'relatedSkillIds', 'relatedTrainingIds', 'selectedMediaIds'].includes(key)) return Array.isArray(item) && item.every(id => typeof id === 'string');
    if (key === 'levels') return plain(item) && ['L1', 'L2', 'L3', 'L4', 'L5'].every(level => typeof item[level] === 'string');
    if (['definitionVersion', 'modelVersion', 'currentProgress'].includes(key)) return typeof item === 'number' && Number.isFinite(item);
    if (['targetPerWeek', 'times', 'durationMinutes'].includes(key)) return typeof item === 'string' || typeof item === 'number' && Number.isFinite(item);
    return typeof item === 'string';
  });
export const validFeedbackDraft = value => plain(value) && plain(value.values) && Object.keys(value.values).length === 1 && typeof value.values.coachNotes === 'string' && Number.isSafeInteger(value.baseRevision) && value.baseRevision >= 0;
export const validUploadDraft = value => plain(value) && plain(value.values) && Object.entries(value.values).every(([key, item]) => ['date', 'title', 'description', 'category', 'recordId'].includes(key) && typeof item === 'string') && typeof value.clientRequestId === 'string' && Number.isSafeInteger(value.baseRevision) && typeof value.fileLabel === 'string';
export const draftScopeKey = scope => scope?.backend && scope?.account && scope?.athlete ? [scope.backend, scope.account, scope.athlete].map(encodeURIComponent).join(':') : '';
const legacyKey = collection => collection === 'training' ? 'nico_training_draft_v1' : `nico_form_draft_${collection}`;
export function createDraftStore({ scope, isCurrent = () => true, storage, now = Date.now, validate = plain } = {}) {
  try { storage ??= globalThis.localStorage; } catch { /* 用户仍可在内存中填写、导出。 */ }
  const identity = draftScopeKey(scope), scopedPrefix = `${prefix}${identity}:`;
  const active = () => !!identity && isCurrent(scope);
  const key = collection => `${scopedPrefix}${encodeURIComponent(collection)}`;
  const failed = () => ({ status: 'unavailable' });
  const read = collection => {
    if (!active()) return { status: 'inactive' };
    let text;
    try { if (!storage) return failed(); text = storage.getItem(key(collection)); } catch { return failed(); }
    if (!text) return { status: 'none' };
    try {
      const item = JSON.parse(text);
      if (item.version !== 2 || item.identity !== identity || item.collection !== collection || !validate(item.payload) || !Number.isFinite(item.createdAt) || !Number.isFinite(item.updatedAt) || !Number.isFinite(item.expiresAt) || item.expiresAt !== item.updatedAt + DRAFT_TTL_MS || item.createdAt > item.updatedAt) return { status: 'corrupt' };
      return { ...item, status: now() >= item.expiresAt ? 'expired' : 'ready' };
    } catch { return { status: 'corrupt' }; }
  };
  const write = (collection, payload) => {
    if (!active()) return { status: 'inactive' };
    if (!validate(payload)) return { status: 'corrupt' };
    const previous = read(collection), timestamp = now();
    if (previous.status === 'corrupt') return previous;
    const item = { version: 2, identity, collection, createdAt: previous.createdAt ?? timestamp, updatedAt: timestamp, expiresAt: timestamp + DRAFT_TTL_MS, payload };
    try { if (!storage) return failed(); const text = JSON.stringify(item); if (text.length > 2 * 1024 * 1024) return failed(); storage.setItem(key(collection), text); return { status: 'ready', ...item }; } catch { return failed(); }
  };
  const legacy = collection => {
    if (!active()) return { status: 'inactive' };
    try { if (!storage) return failed(); return { status: storage.getItem(legacyKey(collection)) == null ? 'none' : 'unowned' }; } catch { return failed(); }
  };
  return {
    read, write, legacy,
    restore(collection, { renewExpired = false } = {}) { const result = read(collection); if (result.status === 'expired' && renewExpired) return write(collection, result.payload); return result; },
    remove(collection) { if (!active()) return { status: 'inactive' }; try { if (!storage) return failed(); storage.removeItem(key(collection)); return { status: 'none' }; } catch { return failed(); } },
    list() {
      if (!active()) return { status: 'inactive', items: [] };
      try {
        if (!storage) return { ...failed(), items: [] };
        const items = [];
        for (let i = 0; i < storage.length; i++) { const name = storage.key(i); if (name?.startsWith(scopedPrefix)) { const collection = decodeURIComponent(name.slice(scopedPrefix.length)); const item = read(collection); items.push({ collection, status: item.status, expiresAt: item.expiresAt }); } }
        return { status: 'ready', items };
      } catch { return { ...failed(), items: [] }; }
    },
    clear() { const found = this.list(); if (found.status !== 'ready') return found; for (const item of found.items) { const result = this.remove(item.collection); if (result.status !== 'none') return result; } return { status: 'cleared' }; },
    importLegacy(collection, { confirmOwnership = false } = {}) {
      if (!active()) return { status: 'inactive' };
      if (!confirmOwnership) return { status: 'confirmation-required' };
      if (read(collection).status !== 'none') return { status: 'exists' };
      try { if (!storage) return failed(); const text = storage.getItem(legacyKey(collection)); return text ? write(collection, JSON.parse(text)) : { status: 'none' }; } catch { return { status: 'corrupt' }; }
    },
  };
}
