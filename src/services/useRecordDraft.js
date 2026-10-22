import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDraftStore } from './drafts.js';
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export const validRecordDraft = value => object(value) && object(value.values) && (value.editing == null || typeof value.editing === 'string') && (value.baseRevision == null || Number.isSafeInteger(value.baseRevision));
export const validTrainingDraft = value => validRecordDraft(value) && ['trainings', 'trainingTemplates'].includes(value.kind) && Array.isArray(value.values.sets) && value.values.sets.every(object) && Array.isArray(value.values.mediaIds) && value.values.mediaIds.every(id => typeof id === 'string') && typeof value.clientRequestId === 'string';

export default function useRecordDraft(api, collection, validate = validRecordDraft) {
  const scope = api?.getDraftScope();
  const store = useMemo(() => createDraftStore({ scope, isCurrent: value => api?.getDraftScope() === value, validate }), [api, scope, validate]);
  const [found, setFound] = useState(() => store.read(collection));
  const [legacy, setLegacy] = useState(() => store.legacy(collection));
  const [warning, setWarning] = useState('');
  useEffect(() => { setFound(store.read(collection)); setLegacy(store.legacy(collection)); setWarning(''); }, [store, collection]);
  const check = useCallback(result => {
    if (result.status === 'unavailable') setWarning('此设备无法保存或删除草稿；当前输入仍在，请导出未提交内容后再离开。');
    if (result.status === 'corrupt') setWarning('草稿格式损坏，未自动恢复；原件保留，可选择删除草稿后重新填写。');
    if (result.status === 'inactive') setWarning('身份已改变，未读取或写入草稿。请重新登录后恢复。');
    return result;
  }, []);
  const persist = useCallback(payload => check(store.write(collection, payload)), [store, collection, check]);
  return {
    found, legacy, warning,
    blocked: ['ready', 'expired', 'corrupt'].includes(found.status),
    persist,
    clear() { const result = check(store.remove(collection)); if (result.status === 'none') { setFound(result); setWarning(''); } return result; },
    restore({ renewExpired = false } = {}) {
      const current = store.read(collection);
      if (current.status === 'expired' && !renewExpired) { setFound(current); return null; }
      const result = check(store.restore(collection, { renewExpired }));
      if (result.status !== 'ready') { setFound(result); return null; }
      setFound({ status: 'none' }); setWarning(''); return result.payload;
    },
    importLegacy() {
      if (!window.confirm('旧草稿没有账号归属。只有确认它属于当前登录账号和Nico档案时才能导入。继续只创建当前身份的副本，原件保留，不会自动提交。')) return;
      const result = check(store.importLegacy(collection, { confirmOwnership: true }));
      if (result.status === 'ready') setFound(result);
      else if (result.status === 'exists') setWarning('当前身份已有草稿，请先处理它，再导入旧草稿。');
    },
  };
}
