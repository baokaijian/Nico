import { useEffect, useRef, useState } from 'react';
import { FIELDS, ordered, validateRecord } from '../../shared/domain.mjs';
import { TRAINING_STATUSES, trainingDraft, trainingFacts, trainingSummary } from '../../shared/training.ts';
import { today, downloadJSON } from '../services/files';
import { Field, Message, Empty } from './ui';
import TrainingSetEditor, { TrainingSetSummary } from './TrainingSetEditor';
import useRecordDraft, { validTrainingDraft } from '../services/useRecordDraft';
import DraftNotice, { draftHint } from './DraftNotice';
const initialValues = kind => ({ ...Object.fromEntries(FIELDS[kind].map(f => [f.key, f.key === 'date' ? today() : ''])), entryMode: '快速', completionStatus: '未记录', sets: [], mediaIds: [] });
export default function TrainingRecords({ data, api, onSaved, readOnly = false, manageTemplates = true, initialFilter = '', initialOpen = false, onLinkMedia }) {
  const newDraft = (kind = 'trainings', values = {}) => ({ kind, editing: null, values: { ...initialValues(kind), ...values }, clientRequestId: crypto.randomUUID(), baseRevision: api.getRevision() });
  const [draft, setDraft] = useState(() => newDraft()), [open, setOpen] = useState(initialOpen);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [conflict, setConflict] = useState(false);
  const [filter, setFilter] = useState(initialFilter), [from, setFrom] = useState(''), [to, setTo] = useState(''), [status, setStatus] = useState('');
  const formRef = useRef(null), dirty = useRef(false);
  const localDraft = useRecordDraft(api, 'training', validTrainingDraft);
  const { persist } = localDraft;
  const [savedTraining, setSavedTraining] = useState(null);
  const templates = data.trainingTemplates || [], { kind, values, editing } = draft, template = kind === 'trainingTemplates';
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  useEffect(() => { if (initialOpen) setOpen(true); }, [initialOpen]);
  useEffect(() => { if (dirty.current && !readOnly) persist(draft); }, [draft, readOnly, persist]);
  const change = (key, value) => { dirty.current = true; setDraft(d => ({ ...d, values: { ...d.values, [key]: value } })); };
  const replace = next => {
    if (localDraft.blocked) { setError('请先处理本账号未提交草稿，再填写或复制安排。'); return; }
    if (dirty.current && !window.confirm('替换当前未保存表单？继续前可先导出草稿。')) return;
    dirty.current = true; setDraft(next); setOpen(true); setError(''); setConflict(false);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };
  const reset = () => { dirty.current = false; setDraft(newDraft()); setError(''); setConflict(false); localDraft.clear(); };
  const edit = (row, targetKind = 'trainings') => replace({ kind: targetKind, editing: row.id, values: { ...Object.fromEntries(FIELDS[targetKind].map(f => [f.key, row[f.key] ?? ''])), sets: structuredClone(row.sets || []), mediaIds: [...row.mediaIds || []] }, baseRevision: api.getRevision(), clientRequestId: crypto.randomUUID() });
  const copy = (row, isTemplate = false) => replace(newDraft('trainings', trainingDraft(row, isTemplate)));
  const makeTemplate = row => {
    const arrangement = trainingDraft(row);
    replace(newDraft('trainingTemplates', { ...Object.fromEntries(FIELDS.trainingTemplates.map(f => [f.key, arrangement[f.key] ?? ''])), title: row.session || '', sets: arrangement.sets }));
  };
  const save = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      // Only whitelisted editable fields leave the form; metadata is owned by the server.
      const body = { ...Object.fromEntries(FIELDS[kind].map(f => [f.key, values[f.key] ?? ''])), sets: values.sets, ...(!template ? { mediaIds: values.mediaIds } : {}), ...(!editing ? { clientRequestId: draft.clientRequestId } : {}) };
      validateRecord(kind, body, editing ? data[kind].find(row => row.id === editing) : null);
      const saved = await api.request(`/api/${kind}${editing ? `/${editing}` : ''}`, { method: editing ? 'PUT' : 'POST', body, expectedRevision: draft.baseRevision });
      onSaved(kind, saved); reset(); setSavedTraining(template ? null : saved); setMessage(template ? '模板已保存；只保存训练安排，不计入实际训练统计。' : '训练已保存，实际完成量与统计已更新。'); setOpen(false);
    } catch (problem) { setError(problem.message); setConflict(problem.status === 409); } finally { setBusy(false); }
  };
  const remove = async (targetKind, id) => {
    if (!window.confirm('移入回收站？原记录和影像保留，可在档案页恢复。')) return;
    setBusy(true); setError('');
    try { await api.request(`/api/${targetKind}/${id}`, { method: 'DELETE' }); onSaved(targetKind, null, id); setMessage('已移入回收站，可在档案页恢复。'); if (editing === id) reset(); } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  };
  const mode = values.entryMode || '快速';
  const grouped = mode === '训练组';
  const allFields = FIELDS[kind];
  const field = key => allFields.find(f => f.key === key);
  const renderFields = keys => keys.map(key => field(key) && <Field key={key} field={field(key)} value={values[key]} onChange={v => change(key, v)}/>);
  const records = ordered(data.trainings).reverse().filter(r => (!from || r.date >= from) && (!to || r.date <= to) && (!status || (r.completionStatus || '未记录') === status) && (!filter.trim() || JSON.stringify(r).includes(filter.trim())));
  const summary = trainingSummary(records), latest = ordered(data.trainings).at(-1);
  const recentContents = [...new Set(ordered(data.trainings).reverse().map(row => row.trainingType?.trim()).filter(Boolean))].slice(0, 4);
  const plans = data.plans.flatMap(p => (p.sessions || []).filter(s => s.type === '训练').map(s => ({ id: `${p.id}/${s.id}`, label: `${s.date} · ${s.title || '训练'} · ${p.title} v${p.version}`, plan: p, session: s })));
  const selectPlan = id => { const plan = plans.find(p => p.id === id); dirty.current = true; setDraft(d => ({ ...d, values: { ...d.values, plannedSessionId: id, plannedSessionVersion: plan?.plan.version ?? '' } })); };
  const applyPlan = () => {
    const original = editing && previous?.plannedSessionId === values.plannedSessionId;
    if (original && !previous.plannedSessionSnapshot) { setError('历史记录未保存原课次版本与组表，不能用当前计划猜测。请手动填写实际内容，或选择其他明确课次。'); return; }
    const session = original ? previous.plannedSessionSnapshot.session : plans.find(p => p.id === values.plannedSessionId)?.session;
    if (!session?.sets?.length) { setError('所选计划课次没有训练组；可以手动记录实际内容。'); return; }
    if (!window.confirm('带入此课次的计划组表，并清空当前实际距离和组数？计划组数不会自动记为实际完成。')) return;
    dirty.current = true;
    setDraft(d => ({ ...d, values: { ...d.values, entryMode: '训练组', completionStatus: '未记录', totalMeters: null, kickMeters: null, sets: session.sets.map((s, i) => ({ id: `set-${i + 1}`, task: s.task, stroke: '', distanceMeters: s.distance, plannedRepeats: s.repeats, completedRepeats: null, restSeconds: s.restSeconds, isKick: false })) } }));
  };
  const switchMode = next => {
    if (next === '快速' && values.sets.length && !window.confirm('切换快速模式会移除本表单组表，实际总距离需重新填写。继续？')) return;
    dirty.current = true; setDraft(d => ({ ...d, values: { ...d.values, entryMode: next, sets: next === '快速' ? [] : d.values.sets, totalMeters: null, kickMeters: null } }));
  };
  const previous = editing ? data.trainings.find(r => r.id === editing) : null;
  return <div className="stack fade-in training-records"><header><h1>水上训练记录</h1><p className="muted">记录实际训练；计划与模板是参考，留空表示未知，0表示实际为零。</p></header>
    {message && <Message>{message}{savedTraining && onLinkMedia && <button type="button" onClick={() => onLinkMedia(savedTraining)}>为这次训练关联影像</button>}</Message>}<Message error>{error}</Message>
    {conflict && <Message>输入已保留。请先用顶部“刷新记录”核对最新数据。<button type="button" onClick={() => { setDraft(d => ({ ...d, baseRevision: api.getRevision() })); setConflict(false); setError('请确认是否已有同一次训练；同一新建请求不会重复创建。'); }}>已核对最新记录，允许重试</button></Message>}
    {!readOnly && <>
      <div className="actions"><button className="apple-btn apple-btn-primary" disabled={busy} onClick={() => { if (!open) setOpen(true); else replace(newDraft()); }}>记录本次训练</button><button className="apple-btn apple-btn-secondary" disabled={busy || !latest} onClick={() => copy(latest)}>复制上次训练安排</button></div>
      <DraftNotice draft={localDraft} onRestore={payload => { dirty.current = true; setDraft(payload); setOpen(true); }}/>

      <details className="glass-card" open={open} onToggle={e => setOpen(e.currentTarget.open)} ref={formRef}><summary>{template ? `${editing ? '编辑' : '新建'}训练模板` : `${editing ? '编辑' : '添加'}训练`}</summary>
        <form onSubmit={save}><fieldset disabled={busy || localDraft.blocked}><legend className="sr-only">{template ? '模板安排' : '本次训练'}</legend><div className={`form-grid ${!template && !grouped ? 'training-quick-fields' : ''}`}>{renderFields(template ? ['title', 'stroke', 'trainingType'] : ['date', 'durationMinutes', ...(!grouped ? ['totalMeters'] : []), 'trainingType', 'stroke', 'completionStatus'])}{template && !grouped && renderFields(['plannedMeters', 'plannedDurationMinutes'])}</div>
          {!template && recentContents.length > 0 && <div className="actions" role="group" aria-label="最近使用的训练内容"><span>最近使用：</span>{recentContents.map(content => <button type="button" key={content} aria-pressed={values.trainingType === content} onClick={() => change('trainingType', content)}>{content}</button>)}</div>}
          <details open={grouped}><summary>专业训练组（可选）</summary><Field field={field('entryMode')} value={mode} onChange={switchMode}/>{grouped && <TrainingSetEditor sets={values.sets} onChange={v => change('sets', v)} template={template} disabled={busy}/>}</details>
          {!template && <><details><summary>感受、反馈和计划关联（可选）</summary><div className="form-grid">{renderFields(['feeling', 'session', 'discomfort', 'coachNotes', 'notes', 'focusSkills', 'rpe', 'completionRate', 'intensity', 'recordedBy', ...(!grouped ? ['kickMeters'] : [])])}<Field field={{ key: 'plannedSessionId', label: '关联计划课次', type: 'select', options: plans.map(p => p.id), optionLabels: Object.fromEntries(plans.map(p => [p.id, p.label])) }} value={values.plannedSessionId} onChange={selectPlan}/></div>{values.plannedSessionId && <p>关联版本：{values.plannedSessionVersion || '历史记录未记版本'}。课次改动不会修改已保存的训练事实。<button type="button" onClick={applyPlan}>带入所关联版本的组表（清空实际组数）</button></p>}{(values.plannedMeters !== '' && values.plannedMeters != null || values.plannedDurationMinutes !== '' && values.plannedDurationMinutes != null) && <p>复制的参考安排：{values.plannedMeters ?? '未填'}米 · {values.plannedDurationMinutes ?? '未填'}分钟；请另填本次实际完成量。</p>}</details>
          <details><summary>关联照片与视频（可选）</summary><p className="muted">只关联现有素材，公开范围仍由家长在发布设置中单独确认。</p>{!data.media.length && <Empty>尚无素材，可保存训练后在影像页面上传。</Empty>}{data.media.map(m => <label className="training-check" key={m.id}><input type="checkbox" checked={values.mediaIds.includes(m.id)} onChange={e => change('mediaIds', e.target.checked ? [...values.mediaIds, m.id] : values.mediaIds.filter(id => id !== m.id))}/>{m.date} · {m.title}</label>)}{values.mediaIds.filter(id => !data.media.some(m => m.id === id)).map(id => <label className="training-check" key={id}><input type="checkbox" checked onChange={() => change('mediaIds', values.mediaIds.filter(x => x !== id))}/>已移入回收站的原关联 · {id}</label>)}{previous && data.media.some(m => m.recordId === previous.id) && <p>素材说明中的既有关联：{data.media.filter(m => m.recordId === previous.id).map(m => m.title).join('、')}（在素材说明中维护）</p>}</details></>}
          {template && <div className="form-grid">{grouped && renderFields(['plannedDurationMinutes'])}{renderFields(['notes'])}</div>}
          <div className="actions"><button className="apple-btn apple-btn-primary">{busy ? '正在保存…' : template ? '保存模板' : '保存训练'}</button><button type="button" onClick={reset} className="apple-btn apple-btn-secondary">清空 / 取消</button><button type="button" className="apple-btn apple-btn-secondary" onClick={() => downloadJSON('Nico-训练-未提交草稿.json', draft)}>导出未提交草稿</button></div>
          <p className="muted">{draftHint} 保存失败时输入保留。模板和复制会清空实际量、感受及影像；需按本次情况填写。</p>
        </fieldset></form>
      </details>
      <section className="glass-card"><div className="flex-between"><h2>我的训练模板</h2>{manageTemplates && <button disabled={busy} onClick={() => replace(newDraft('trainingTemplates'))}>新建模板</button>}</div>{!templates.length ? <Empty>尚无模板。可将已记录训练的安排另存为模板；平台不预设训练量。</Empty> : templates.map(t => <article key={t.id} className="training-template"><h3>{t.title} · v{t.version}</h3><p>{t.trainingType || '未填写训练内容'} · {t.entryMode} · 参考{t.plannedMeters ?? '未填'}米</p><div className="actions"><button disabled={busy} onClick={() => copy(t, true)}>使用模板</button>{manageTemplates && <><button disabled={busy} onClick={() => edit(t, 'trainingTemplates')}>编辑模板</button><button disabled={busy} onClick={() => remove('trainingTemplates', t.id)}>模板移入回收站</button></>}</div></article>)}</section>
    </>}
    <section className="glass-card"><h2>训练历史</h2><div className="filter-bar"><label>查找训练<input className="apple-input" value={filter} onChange={e => setFilter(e.target.value)}/></label><Field field={{ key: 'from', label: '起始日期', type: 'date' }} value={from} onChange={setFrom}/><Field field={{ key: 'to', label: '结束日期', type: 'date' }} value={to} onChange={setTo}/><Field field={{ key: 'status', label: '完成情况', type: 'select', options: TRAINING_STATUSES }} value={status} onChange={setStatus}/></div>
      <p>当前{records.length}条记录 · 有实际训练依据{summary.count}次 · 已知时长{summary.minutes ?? '未记录'}分钟 · 已知距离汇总{summary.knownMeters}米{summary.unknownSets ? `（另有${summary.unknownSets}组未填实际次数）` : ''}。只统计已知部分，不以计划量补齐；未录入不能解释为实际零。</p>
      {(filter || from || to || status) && <button onClick={() => { setFilter(''); setFrom(''); setTo(''); setStatus(''); }}>清除筛选</button>}
    </section>
    {!records.length && <Empty>{data.trainings.length ? '没有符合当前筛选条件的训练。' : '尚无训练记录；未录入不代表没有训练。'}</Empty>}
    <div className="record-list">{records.map(row => { const facts = trainingFacts(row), linked = data.media.filter(m => m.recordId === row.id || row.mediaIds?.includes(m.id)); return <article className="glass-card" key={row.id}><div className="flex-between"><h2>{row.date} · {row.session || '水上训练'}</h2>{!readOnly && <div className="actions"><button disabled={busy} onClick={() => edit(row)}>编辑训练</button><button disabled={busy} onClick={() => copy(row)}>复制安排</button>{manageTemplates && <button disabled={busy} onClick={() => makeTemplate(row)}>另存为模板</button>}<button disabled={busy} onClick={() => remove('trainings', row.id)}>移入回收站</button></div>}</div><p>{row.completionStatus || '完成情况未记录'} · {row.stroke || '泳姿未记录'} · 实际时长{facts.minutes ?? '未记录'}分钟 · 实际距离{facts.meters == null ? `未填完整（已知${facts.knownMeters}米）` : `${facts.meters}米`}</p>
      {row.entryMode === '训练组' && <details><summary>查看训练组</summary>{row.sets.map((s, i) => <p key={s.id}>第{i + 1}组：{s.task || s.stroke || '内容未填'} · 每次{s.distanceMeters}米 · 计划{s.plannedRepeats ?? '未填'}次 · 实际{s.completedRepeats ?? '未填'}次{s.isKick ? ' · 打腿' : ''}</p>)}<TrainingSetSummary sets={row.sets}/></details>}
      <p>训练感受：{row.feeling || '未记录'} · 教练反馈：{row.coachNotes || '未记录'}</p><p>关联影像：{linked.map(m => m.title).join('、') || '未关联'}{row.mediaIds?.some(id => !data.media.some(m => m.id === id)) ? '（部分原关联在回收站）' : ''}</p>
      <details><summary>完整字段与来源</summary><dl className="record-fields">{FIELDS.trainings.map(f => <div key={f.key}><dt>{f.label}</dt><dd>{row[f.key] ?? '未记录'}</dd></div>)}<div><dt>记录ID</dt><dd>{row.id}</dd></div><div><dt>创建 / 修改</dt><dd>{row.createdAt || '历史创建时间未记录'} / {row.updatedAt || '未记录'}</dd></div></dl>{row.plannedSessionSnapshot && <p>录入时计划：{row.plannedSessionSnapshot.planTitle} v{row.plannedSessionSnapshot.planVersion} · {row.plannedSessionSnapshot.session.title || row.plannedSessionSnapshot.session.date}（保留原快照）</p>}</details>
    </article>; })}</div>
  </div>;
}
