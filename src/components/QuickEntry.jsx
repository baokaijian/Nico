import { lazy, Suspense, useEffect, useState } from 'react';
import { newEntryFlow, advanceEntryFlow, entryContext, entryDefaults, validEntryFlow } from '../services/entry-flow';
import useRecordDraft from '../services/useRecordDraft';
import { performanceLabel } from '../../shared/performance.ts';
import { trainingFacts } from '../../shared/training.ts';
import { Modal, Message } from './ui';
import DraftNotice from './DraftNotice';
import TrainingFeedback from './TrainingFeedback';
const Records = lazy(() => import('./Records'));
const Skills = lazy(() => import('./Skills'));
const Gallery = lazy(() => import('./MediaGallery'));
const labels = { training: '记录训练', score: '记录成绩', skill: '技能测评', media: '添加影像', feedback: '教练反馈', summary: '本次完成摘要' };
export default function QuickEntry({ type, context = {}, data, api, onSaved, reload, onClose, navigate, role }) {
  const [flow, setFlow] = useState(() => newEntryFlow(type, context)), [busy, setBusy] = useState(false), [info, setInfo] = useState('');
  const draft = useRecordDraft(api, 'quickEntry', validEntryFlow), { persist } = draft;
  useEffect(() => { if (!draft.blocked) persist(flow); }, [flow, draft.blocked, persist]);
  const current = entryContext(flow, data), defaults = entryDefaults(flow.step, current, data);
  const changeStep = step => { setInfo(''); setFlow(value => advanceEntryFlow(value, { type: 'step', step })); };
  const saved = (record, collection, outcome = {}) => {
    setFlow(value => { const next = advanceEntryFlow(value, { type: 'saved', collection, id: record.id }); return outcome.warning ? advanceEntryFlow(next, { type: 'failed', message: outcome.warning }) : next; });
  };
  const close = () => { if (busy) { setInfo('正在确认保存结果，请稍候。'); return; } onClose(); };
  const shared = { data, api, onSaved, readOnly: false, entryOnly: true, initialOpen: true, initialContext: defaults, draftKey: flow.id, clientRequestId: flow.requests[flow.step], onRecordSaved: saved, onBusyChange: setBusy };
  return <Modal title={labels[flow.step]} onClose={close}><div className="quick-entry" aria-busy={busy}><Message>{info}</Message><DraftNotice draft={draft} onRestore={setFlow}/>
    {!draft.blocked && <>{current.blocked ? <Message error>{current.message}</Message> : <>
      {current.training && <p className="entry-context">本次训练：{current.training.date} · {current.training.session || current.training.trainingType || '水上训练'} <span>已保存</span></p>}
      {flow.step === 'summary' ? <section className="entry-summary"><h3>已保存到私有档案</h3>{current.training && <p>实际时长{trainingFacts(current.training).minutes ?? '未记录'}分钟 · 实际距离{trainingFacts(current.training).meters ?? '未记录'}米</p>}<Message>{flow.error}</Message>
        <ul>{flow.scoreIds.map(id => <li key={id}>{data.swim.find(row => row.id === id) ? `成绩已保存：${performanceLabel(data.swim.find(row => row.id === id))}` : '成绩已获保存确认；请刷新核对当前状态。'}</li>)}{flow.mediaIds.map(id => <li key={id}>{flow.trainingId ? '影像已关联：' : '影像已保存：'}{data.media.find(row => row.id === id)?.title || '请刷新核对当前状态'}</li>)}{flow.assessmentIds.map(id => <li key={id}>技能测评已保存，等待独立人工确认。</li>)}{flow.feedbackSaved && <li>教练反馈已保存。</li>}</ul>
        <p>以下补充步骤可自由跳过；公开展示需要另行选择。</p><div className="entry-next-actions">{flow.trainingId && <button onClick={() => changeStep('score')}>添加成绩</button>}<button onClick={() => changeStep('media')}>{role === 'owner' ? '上传视频或关联影像' : '关联已有影像'}</button>{flow.trainingId && <button onClick={() => changeStep('feedback')}>记录教练反馈</button>}{flow.assessmentIds.length > 0 && <button onClick={() => { draft.clear(); onClose(); navigate('growth', 'skills'); }}>前往成长管理确认测评</button>}<button className="apple-btn apple-btn-primary" onClick={() => { draft.clear(); onClose(); }}>结束</button></div>
      </section> : <Suspense fallback={<Message>正在打开录入表单…</Message>}>
        {flow.step === 'training' && <Records {...shared} key={`training-${flow.id}`} type="trainings"/>}
        {flow.step === 'score' && <Records {...shared} key={flow.requests.score} type="swim"/>}
        {flow.step === 'skill' && role === 'owner' && <Skills {...shared} key={flow.requests.skill}/>}
        {flow.step === 'media' && <Gallery {...shared} key={flow.requests.media} allowUpload={role === 'owner'} initialRecord={defaults} reload={reload}/>}
        {flow.step === 'feedback' && current.training && <TrainingFeedback training={current.training} api={api} draftKey={flow.id} onSaved={onSaved} onDone={() => setFlow(value => advanceEntryFlow(value, { type: 'feedback' }))} onBusyChange={setBusy}/>}
      </Suspense>}
    </>}
      {flow.step !== 'summary' && flow.trainingId && <button disabled={busy} className="entry-back" onClick={() => changeStep('summary')}>回到本次完成摘要（可跳过补充）</button>}
    </>}
    <div className="entry-tools"><button disabled={busy} onClick={reload}>刷新服务端记录</button><button disabled={busy} onClick={close}>暂存并关闭</button></div><small className="muted">保存失败时保留输入；主记录成功与后续关联分别确认。视频文件需在刷新后重新选择。</small>
  </div></Modal>;
}
