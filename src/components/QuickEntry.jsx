import {createBusyRegistry} from '../services/busy-registry';
import SourceWorkspace from './SourceWorkspace';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { newEntryFlow, advanceEntryFlow, entryContext, entryDefaults, validEntryFlow, canFinishEntryFlow } from '../services/entry-flow';
import { createDraftStore } from '../services/drafts';
import useRecordDraft from '../services/useRecordDraft';
import { performanceLabel } from '../../shared/performance.ts';
import { readablePerformance } from '../../shared/score-conditions.mjs';
import { trainingFacts } from '../../shared/training.ts';
import { Modal, Message } from './ui';
import DraftNotice from './DraftNotice';
import TrainingFeedback from './TrainingFeedback';
const Records = lazy(() => import('./Records'));
const Skills = lazy(() => import('./Skills'));
const Gallery = lazy(() => import('./MediaGallery'));
const labels = { training: '记录训练', score: '记录成绩', skill: '技能测评', media: '添加影像', feedback: '教练反馈', summary: '本次完成摘要', goals:'关联成长目标', review:'本次成长复盘' };
export default function QuickEntry({ type, context = {}, data, api, onSaved, reload, onClose, navigate, role, restoreFocus }) {
  const [flow, setFlow] = useState(() => newEntryFlow(type, context)), [busy, setBusy] = useState(false), [info, setInfo] = useState(''), [source,setSource]=useState(null),[standardsOpen,setStandardsOpen]=useState(false);
  const busyRegistry=useMemo(()=>createBusyRegistry(setBusy),[]);
  const draft = useRecordDraft(api, 'quickEntry', validEntryFlow), { persist } = draft;
  useEffect(() => { if (!draft.blocked) persist(flow); }, [flow, draft.blocked, persist]);
  const current = entryContext(flow, data), defaults = entryDefaults(flow.step, current, data);
  const changeStep = step => { setInfo(''); setFlow(value => advanceEntryFlow(value, { type: 'step', step })); };
  const saved = (record, collection, outcome = {}) => {
    setFlow(value => { const next = advanceEntryFlow(value, { type: 'saved', collection, id: record.id }); return outcome.warning ? advanceEntryFlow(next, { type: 'failed', message: outcome.warning }) : next; });
  };
  const finish = () => { const list = createDraftStore({scope: api.getDraftScope()}).list(); if (canFinishEntryFlow(list, flow.id)) draft.clear(); onClose(); };
  const close = () => { if (busy) { setInfo('正在确认保存结果，请稍候。'); return; } onClose(); };
  const shared = { data, api, onSaved, readOnly: false, entryOnly: true, initialOpen: true, initialContext: defaults, draftKey: flow.id, clientRequestId: flow.requests[flow.step], onRecordSaved: saved, onBusyChange: busyRegistry.channel('entry') };
  return <Modal title={labels[flow.step]} onClose={close} restoreFocus={restoreFocus}><div className="quick-entry" aria-busy={busy}><Message>{info}</Message><DraftNotice draft={draft} onRestore={setFlow}/>
    {!draft.blocked && <>{current.blocked ? <Message error>{current.message}</Message> : <>
      {current.training && <p className="entry-context">本次训练：{current.training.date} · {current.training.session || current.training.trainingType || '水上训练'} <span>已保存</span></p>}
      {flow.step==='goals'?<section><h3>关联已有目标</h3><p>打开原目标，把本次训练带入编辑并人工保存。目标确认与里程碑审核仍为两个独立动作。</p>{data.goals.length?data.goals.map(g=><article className="history-entry" key={g.id}><b>{g.title}</b><p>{g.status} · {g.relatedTrainingIds?.includes(flow.trainingId)?'已关联本次训练':'尚未关联本次训练'}</p><button onClick={()=>setSource({collection:'goals',id:g.id})}>核对并编辑此目标</button></article>):<Message>尚无目标，可稍后在成长管理按真实起点建立，不自动补造。</Message>}</section>:flow.step==='review'?<section><h3>本次已保存的来源</h3><p>逐条核对原记录，测评待确认不是已掌握，未核验成绩不参与有效PB。</p>{[{collection:'trainings',id:flow.trainingId},...flow.scoreIds.map(id=>({collection:'swim',id})),...flow.mediaIds.map(id=>({collection:'media',id})),...flow.assessmentIds.map(id=>({collection:'skillAssessments',id}))].filter(r=>r.id).map(r=><p key={r.collection+r.id}><button onClick={()=>setSource(r)}>{({trainings:'本次训练',swim:'本次成绩',media:'本次影像',skillAssessments:'本次测评'})[r.collection]} · {data[r.collection]?.find(x=>x.id===r.id)?.status||'查看原记录'}</button></p>)}<button onClick={()=>{finish();navigate('review','reports');}}>前往周期报告复盘</button></section>:flow.step === 'summary' ? <section className="entry-summary"><h3>已保存到私有档案</h3>{current.training && <p>实际时长{trainingFacts(current.training).minutes ?? '未记录'}分钟 · 实际距离{trainingFacts(current.training).meters ?? '未记录'}米</p>}<Message>{flow.error}</Message>
        <ul>{flow.scoreIds.map(id => <li key={id}>{data.swim.find(row => row.id === id) ? `成绩已保存：${performanceLabel(data.swim.find(row => row.id === id))}${readablePerformance(data.swim.find(row => row.id === id)) ? `（${readablePerformance(data.swim.find(row => row.id === id))}）` : ''}` : '成绩已获保存确认；请刷新核对当前状态。'}</li>)}{flow.mediaIds.map(id => <li key={id}>{flow.trainingId ? '影像已关联：' : '影像已保存：'}{data.media.find(row => row.id === id)?.title || '请刷新核对当前状态'}</li>)}{flow.assessmentIds.map(id => <li key={id}>技能测评已保存，等待独立人工确认。</li>)}{flow.feedbackSaved && <li>教练反馈已保存。</li>}</ul>
        <p>以下补充步骤可自由跳过；公开展示需要另行选择。</p><div className="entry-next-actions">{flow.trainingId && <button onClick={() => changeStep('score')}>添加成绩</button>}<button onClick={() => changeStep('media')}>{role === 'owner' ? '上传视频或关联影像' : '关联已有影像'}</button>{flow.trainingId&&role==='owner'&&<><button onClick={()=>changeStep('skill')}>记录技能测评</button><button onClick={()=>changeStep('goals')}>关联成长目标</button><button onClick={()=>changeStep('review')}>核对本次成长来源</button></>}{flow.trainingId && <button onClick={() => changeStep('feedback')}>记录教练反馈</button>}{flow.assessmentIds.length > 0 && <button onClick={() => { finish(); navigate('growth', 'skills'); }}>前往成长管理确认测评</button>}<button className="apple-btn apple-btn-primary" onClick={finish}>结束</button></div>
      </section> : <Suspense fallback={<Message>正在打开录入表单…</Message>}>
        {flow.step === 'training' && <Records {...shared} key={`training-${flow.id}`} type="trainings"/>}
        {flow.step === 'score' && <Records {...shared} key={flow.requests.score} type="swim"/>}
        {flow.step === 'skill' && role === 'owner' && <><p>本次训练已作为证据引用带入；实际等级和可见观察仍需填写，日期可按实际测评日调整。</p><button disabled={busy} onClick={()=>{if(!busy)setStandardsOpen(true);}}>配置或审核技能标准</button><Skills {...shared} key={flow.requests.skill}/></>}
        {flow.step === 'media' && <Gallery {...shared} key={flow.requests.media} allowUpload={role === 'owner'} initialRecord={defaults} reload={reload}/>}
        {flow.step === 'feedback' && current.training && <TrainingFeedback training={current.training} api={api} draftKey={flow.id} onSaved={onSaved} onDone={() => setFlow(value => advanceEntryFlow(value, { type: 'feedback' }))} onBusyChange={busyRegistry.channel('entry')}/>}
      </Suspense>}
    </>}
      {flow.step !== 'summary' && flow.trainingId && <button disabled={busy} className="entry-back" onClick={() => changeStep('summary')}>回到本次完成摘要（可跳过补充）</button>}
    </>}
    {source&&<SourceWorkspace source={source} data={data} api={api} onSaved={onSaved} reload={reload} role={role} readOnly={role!=='owner'} contextTrainingId={flow.trainingId} onBusyChange={busyRegistry.channel('source')} onClose={()=>{if(!busy)setSource(null);}}/>}
    {standardsOpen&&<Modal title="配置真实技能标准" onClose={()=>{if(!busy)setStandardsOpen(false);}}><Suspense fallback={<Message>正在打开标准…</Message>}><Skills data={data} api={api} onSaved={onSaved} readOnly={role!=='owner'} initialSection="standards" onBusyChange={busyRegistry.channel('standards')}/></Suspense></Modal>}
    <div className="entry-tools"><button disabled={busy} onClick={close}>暂存并关闭</button><details className="more-actions"><summary aria-label="更多操作" title="更多操作">⋯</summary><div className="more-menu" role="menu"><button disabled={busy} role="menuitem" onClick={reload}>刷新服务端记录</button></div></details></div><small className="muted">保存失败时保留输入；主记录成功与后续关联分别确认。视频文件需在刷新后重新选择。</small>
  </div></Modal>;
}
