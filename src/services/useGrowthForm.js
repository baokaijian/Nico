import { useCallback, useEffect, useRef, useState } from 'react';
import { validateRecord } from '../../shared/domain.mjs';
import { editableManagementRecord } from './record-form';
import useRecordDraft from './useRecordDraft';
import { validGrowthDraft } from './drafts';
export default function useGrowthForm({ collection, defaults, data, api, onSaved, readOnly, initialValues = {}, requestId, draftCollection, onRecordSaved, onBusyChange }) {
  const fresh = useCallback(values => ({ values: { ...defaults(), ...initialValues, ...values }, editing: null, baseRevision: api.getRevision(), clientRequestId: requestId || crypto.randomUUID() }), [defaults, api, initialValues, requestId]);
  const [form, setForm] = useState(() => fresh()), [open, setOpen] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [conflict, setConflict] = useState(false);
  const dirty = useRef(false), draft = useRecordDraft(api, draftCollection || collection, validGrowthDraft), { persist } = draft;
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  useEffect(() => { if (dirty.current && !readOnly) persist(form); }, [form, readOnly, persist]);
  const change = (key, value) => { if (draft.blocked || busy) { setError('请先恢复或处理草稿，再更换关联。'); return; } const firstInput = !dirty.current; dirty.current = true; setForm(current => ({ ...current, ...(firstInput ? { baseRevision: api.getRevision() } : {}), values: { ...current.values, [key]: value } })); };
  const replace = (values, editing = null) => {
    if (busy) return false;
    if (draft.blocked) { setError('请先处理本账号未提交草稿，再填写其他记录。'); return false; }
    if (dirty.current && !window.confirm('替换当前未保存表单？继续前可先导出草稿。')) return false;
    dirty.current = true; setForm({ ...fresh(values), editing }); setOpen(true); setError(''); setConflict(false); return true;
  };
  const edit = record => replace(editableManagementRecord(collection, record), record.id);
  const reset = () => { dirty.current = false; setForm(fresh()); draft.clear(); setConflict(false); setError(''); };
  const save = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const previous = form.editing ? data[collection].find(record => record.id === form.editing) : null;
      validateRecord(collection, form.values, previous);
      const record = await api.request(`/api/${collection}${form.editing ? `/${form.editing}` : ''}`, { method: form.editing ? 'PUT' : 'POST', body: { ...form.values, ...(!form.editing ? { clientRequestId: form.clientRequestId } : {}) }, expectedRevision: form.baseRevision });
      onSaved(collection, record); reset(); setOpen(false); setNotice('已保存到服务端；确认与达成状态须另行人工核对。'); onRecordSaved?.(record, collection);
    } catch (problem) { setError(problem.message); setConflict(problem.status === 409); } finally { setBusy(false); }
  };
  const remove = async record => {
    if (!window.confirm('移入回收站？原记录、证据和历史保留，可在档案页恢复。')) return;
    setBusy(true); setError('');
    try { await api.request(`/api/${collection}/${record.id}`, { method: 'DELETE' }); onSaved(collection, null, record.id); if (form.editing === record.id) reset(); }
    catch (problem) { setError(problem.message); } finally { setBusy(false); }
  };
  return { ...form, draft, open, setOpen, error, notice, busy, conflict, change, replace, edit, reset, save, remove,
    recover: payload => { dirty.current = true; setForm({ ...fresh(), ...payload, values: { ...defaults(), ...payload.values } }); setOpen(true); },
    retryRevision: () => { setForm(current => ({ ...current, baseRevision: api.getRevision() })); setConflict(false); setError('请核对当前记录，确认没有重复后再保存。'); },
  };
}
