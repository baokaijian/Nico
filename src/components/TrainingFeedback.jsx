import { useState } from 'react';
import { validFeedbackDraft } from '../services/drafts';
import useRecordDraft from '../services/useRecordDraft';
import DraftNotice from './DraftNotice';
import { Field, Message } from './ui';
export default function TrainingFeedback({ training, api, onSaved, onDone, draftKey, onBusyChange }) {
  const [values, setValues] = useState({ coachNotes: training.coachNotes || '' }), [revision, setRevision] = useState(() => api.getRevision()), [error, setError] = useState(''), [conflict, setConflict] = useState(false), [busy, setBusy] = useState(false);
  const draft = useRecordDraft(api, `quick.${draftKey}.feedback`, validFeedbackDraft);
  const save = async event => {
    event.preventDefault(); setBusy(true); onBusyChange(true); setError('');
    try { const saved = await api.request(`/api/trainings/${training.id}`, { method: 'PUT', body: { coachNotes: values.coachNotes }, expectedRevision: revision }); onSaved('trainings', saved); draft.clear(); onDone(); }
    catch (problem) { setError(problem.message); setConflict(problem.status === 409); } finally { setBusy(false); onBusyChange(false); }
  };
  return <form onSubmit={save}><h3>补充本次教练反馈</h3><Message error>{error}</Message><DraftNotice draft={draft} onRestore={payload => { setValues(payload.values); setRevision(payload.baseRevision); }}/>{conflict && <Message>反馈尚未确认保存，请先刷新核对，再<button type="button" onClick={() => { setRevision(api.getRevision()); setConflict(false); }}>采用已核对的新版本</button></Message>}<fieldset disabled={draft.blocked || busy}><Field field={{ key: 'coachNotes', label: '教练原话', type: 'textarea', required: true }} value={values.coachNotes} onChange={value => { const next = { coachNotes: value }; setValues(next); draft.persist({ values: next, baseRevision: revision }); }}/><button className="apple-btn apple-btn-primary">保存教练反馈</button></fieldset></form>;
}
