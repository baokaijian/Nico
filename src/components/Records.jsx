import { TIME_FIELDS, performanceInput, performanceLabel, performanceMilliseconds, validityLabel, eligiblePerformance } from '../../shared/performance.ts';
import { BODY_FIELDS, bodyFormat, dateFormat, derivePrdState } from '../../shared/prd.mjs';
import { missingScoreConditions, scoreConditionLabel, readablePerformance } from '../../shared/score-conditions.mjs';
import { downloadJSON, today } from '../services/files';
import { useEffect, useRef, useState } from 'react';
import { FIELDS, ordered, best, validateRecord, WOMEN_50, STANDARD_SOURCE, STANDARD_VERSION } from '../../shared/domain.mjs';
import { Field, Message, Empty } from './ui';
import TrainingRecords from './TrainingRecords';
import useRecordDraft from '../services/useRecordDraft';
import DraftNotice, { draftHint } from './DraftNotice';
import { recordFormFields, changeRecordField } from '../services/record-form';
const names = { checkins:'练习打卡', swim: '成绩', trainings: '水上训练', fitness: '体能', nutrition: '恢复与饮食', growth: '身体测量', goals: '个人目标', annotations: '录像批注', media: '素材说明' };
// 链路内成绩表单折叠的“计时与条件”字段；独立成绩页仍按原布局完整展示。
const CONDITION_FIELD_KEYS = ['startType', 'timingMethod', 'recordType', 'validityStatus'];
function valueLabel(value) { return value === true ? '按既有专业建议服用' : value === false ? '未服用' : value == null || value === '' ? '未填写' : String(value); }
export default function Records(props) {
  return props.type === 'trainings' ? <TrainingRecords {...props}/> : <GenericRecords {...props}/>;
}
function GenericRecords({ focusMediaId, focusId, type, data, api, onSaved, readOnly = false, allowAdd = true, publicMode = false, initialFilter, entryOnly = false, draftKey = 'entry', initialContext = {}, clientRequestId, onRecordSaved, onBusyChange, initialOpen = false }) {
  const fields = FIELDS[type];
  const displayFields = publicMode ? fields.filter(f => ['date', 'distance', 'stroke', 'time', 'poolLength'].includes(f.key)) : fields;
  const blank = () => ({ ...Object.fromEntries(fields.map(f => [f.key, f.key === 'date' ? today() : ''])), ...(type === 'swim' ? { validityStatus: '未核验' } : {}), ...initialContext });
  const [requestId, setRequestId] = useState(() => clientRequestId || crypto.randomUUID()), dirty = useRef(false);
  const [values, setValues] = useState(blank), [editing, setEditing] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [filter, setFilter] = useState('');
  const [scoreKind, setScoreKind] = useState('全部'), [from, setFrom] = useState(''), [to, setTo] = useState(''), [facets, setFacets] = useState({ distance: '', stroke: '', poolLength: '', validityStatus: '' });
  // 聚焦模式：从待办/引导进入时只显示目标记录，收起新增表单与筛选；可切换回全部。
  const focused = Boolean(focusId), [viewAll, setViewAll] = useState(false);
  const localDraft = useRecordDraft(api, entryOnly ? `quick.${draftKey}.${type}` : type);
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  const [savedMessage, setSavedMessage] = useState('');
  useEffect(() => { if (initialFilter !== undefined) setFilter(initialFilter); }, [initialFilter]);
  const [baseRevision, setBaseRevision] = useState(() => api?.getRevision()), [conflict, setConflict] = useState(false);
  const edit = r => { if (localDraft.blocked) { setError('请先处理本账号未提交草稿，再编辑其他记录。'); return; } setBaseRevision(api.getRevision()); setConflict(false); setEditing(r.id); setValues(Object.fromEntries(fields.map(f => [f.key, type === 'swim' && TIME_FIELDS.includes(f.key) ? performanceInput(r, f.key) : r[f.key] ?? '']))); setError(''); };
  const change = (field, value) => {
    const revision = dirty.current ? baseRevision : api.getRevision(); dirty.current = true; setBaseRevision(revision);
    const next = changeRecordField(type, values, field, value);
    setValues(next); localDraft.persist({ values: next, editing, baseRevision: revision, clientRequestId: requestId });
  };
  const reset = () => { dirty.current = false; setRequestId(clientRequestId || crypto.randomUUID()); setBaseRevision(api.getRevision()); setConflict(false); setEditing(null); setValues(blank()); setError(''); localDraft.clear(); };
  const save = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const previous = editing ? data[type].find(r => r.id === editing) : null;
      validateRecord(type, values, previous);
      localDraft.persist({ values, editing, baseRevision, clientRequestId: requestId });
      const saved = await api.request(`/api/${type}${editing ? `/${editing}` : ''}`, { method: editing ? 'PUT' : 'POST', body: { ...values, ...(!editing && type === 'swim' ? { clientRequestId: requestId } : {}) }, expectedRevision: baseRevision });
      let message = '记录已保存。';
      if (type === 'swim') {
        const prior = best(data.swim, saved.distance, saved.stroke, saved.poolLength);
        message = !eligiblePerformance(saved) ? `成绩已保存：${validityLabel(saved)}；当前不计入PB，原始记录仍保留。`
          : !prior || performanceMilliseconds(saved) < performanceMilliseconds(prior) ? `成绩已保存，刷新${saved.distance}${saved.stroke}（${saved.poolLength}池）个人最佳：${performanceLabel(saved)}。` : '成绩已保存并更新该项目统计。';
      }
      onSaved(type, saved); reset(); setSavedMessage(message); onRecordSaved?.(saved, type);
    } catch (problem) { setError(problem.message); setConflict(problem.status === 409); } finally { setBusy(false); }
  };
  const remove = async id => {
    if (!window.confirm('移入回收站？可以在档案页恢复。')) return;
    try { await api.request(`/api/${type}/${id}`, { method: 'DELETE' }); onSaved(type, null, id); } catch (problem) { setError(problem.message); }
  };
  const dateOf = r => String(r.date || r.deadline || '');
  const hasFilter = Boolean(filter.trim()) || Boolean(from) || Boolean(to) || (!publicMode && type === 'swim' && (scoreKind !== '全部' || Object.values(facets).some(Boolean)));
  const clearFilters = () => { setFilter(''); setFrom(''); setTo(''); setScoreKind('全部'); setFacets({ distance: '', stroke: '', poolLength: '', validityStatus: '' }); };
  const records = ordered(data[type]).reverse().filter(r => {
    if (focusId && !viewAll && r.id !== focusId) return false;
    if (focusMediaId && r.mediaId !== focusMediaId) return false;
    if (type === 'swim' && !publicMode) {
      if (scoreKind !== '全部' && (r.recordType || '未知') !== scoreKind) return false;
      for (const [key, value] of Object.entries(facets)) if (value && (key === 'validityStatus' ? validityLabel(r) : r[key]) !== value) return false;
    }
    if (from && dateOf(r) < from) return false;
    if (to && dateOf(r) > to) return false;
    return !filter.trim() || JSON.stringify(r).includes(filter.trim());
  });
  const effective = derivePrdState(structuredClone(data));
  const sessionOptions = data.plans.flatMap(p => (p.sessions || []).map(s => ({ id: `${p.id}/${s.id}`, label: `${s.date} · ${s.title || s.type} · ${p.title} v${p.version}` })));
  const uiField = field => {
    const choices = field.key === 'trainingId' ? data.trainings.map(row => ({ id: row.id, label: `${row.date} · ${row.session || row.trainingType || '水上训练'}` })) : field.key === 'plannedSessionId' ? sessionOptions : field.key === 'mediaId' ? data.media.map(m => ({ id: m.id, label: `${m.date} · ${m.title} · 尾号${m.id.slice(-4)}` })) : field.key === 'recordId' ? [...data.swim, ...data.trainings].map(r => ({ id: r.id, label: `${r.date} · ${r.distance || r.session || '训练'} ${r.time || ''}` })) : null;
    if (type === 'growth' && BODY_FIELDS.includes(field.key)) return { ...field, step: 0.1 };
    return choices ? { ...field, type: 'select', options: choices.map(o => o.id), optionLabels: Object.fromEntries(choices.map(o => [o.id, o.label])) } : field;
  };
  const formFields = recordFormFields(type, fields, values);
  const facetOptions = key => FIELDS.swim.find(f => f.key === key)?.options || [];
  return <div className="stack fade-in">{!entryOnly && <header><h1>{names[type]}记录</h1><p className="muted">{readOnly ? '查看实际录入的记录，未填写的字段表示未知。' : '填写实际观察；留空表示未记录，0只表示实际为零。'}</p></header>}<Message>{savedMessage}</Message>
    {type === 'growth' && <Message>身体测量须保留一位小数。臂长与臂展分别记录，测量方法未确认时请留空。</Message>}
    {type === 'fitness' && <Message>目前只做个人测量记录。体能值不能替代游泳等级标准；具体训练请与教练沟通后由家长录入。</Message>}
    {type === 'nutrition' && <Message>记录实际睡眠、感受和饮食。晨脉与恢复感受不用于自动判断能否下水；补充剂仅记录既有专业建议。</Message>}
    {type === 'goals' && <Message>历史目标原文完整保留，包含未核实的规则或旧标准。手动进度不代表预测概率；未经确认的原文不作为训练指令。</Message>}
    <Message error>{error}</Message>{conflict && <Message>请先用顶部“刷新记录”读取最新版本，对照下方记录。<button onClick={() => { setBaseRevision(api.getRevision()); setConflict(false); setError('已采用当前版本，请确认输入后再次保存'); }}>已核对最新记录，允许重试</button></Message>}
    {!readOnly && ((allowAdd && !focused) || editing) && <details className="glass-card" open={Boolean(editing) || entryOnly || initialOpen}><summary>{editing ? '编辑记录' : '添加记录'}</summary>
      <DraftNotice draft={localDraft} onRestore={draft => { dirty.current = true; setRequestId(draft.clientRequestId || crypto.randomUUID()); setValues({ ...blank(), ...draft.values }); setEditing(draft.editing); setBaseRevision(draft.baseRevision ?? 0); }}/>

      <form onSubmit={save}><fieldset disabled={busy || localDraft.blocked}><legend className="sr-only">填写记录</legend><div className="form-grid">{(entryOnly && type === 'swim' ? formFields.primary.filter(field => !CONDITION_FIELD_KEYS.includes(field.key)) : formFields.primary).map(field => <Field key={field.key} field={uiField(field)} value={values[field.key]} onChange={v => change(field.key, v)}/>)}</div>{entryOnly && type === 'swim' && formFields.primary.some(field => CONDITION_FIELD_KEYS.includes(field.key)) && <details><summary>计时与条件（可选）</summary><div className="form-grid">{formFields.primary.filter(field => CONDITION_FIELD_KEYS.includes(field.key)).map(field => <Field key={field.key} field={uiField(field)} value={values[field.key]} onChange={v => change(field.key, v)}/>)}</div></details>}{formFields.secondary.length > 0 && <details><summary>补充详细字段（可选）</summary><div className="form-grid">{formFields.secondary.filter(field => !(entryOnly && initialContext.trainingId && field.key === 'trainingId')).map(field => <Field key={field.key} field={uiField(field)} value={values[field.key]} onChange={v => change(field.key, v)}/>)}</div></details>}
        <div className="actions"><button disabled={busy} className="apple-btn apple-btn-primary">{busy ? '正在保存…' : '保存到服务端'}</button><button type="button" onClick={reset} className="apple-btn apple-btn-secondary">清空 / 取消</button><details className="more-actions"><summary aria-label="更多操作" title="更多操作">⋯</summary><div className="more-menu" role="menu"><button type="button" role="menuitem" onClick={() => downloadJSON(`Nico-${type}-未提交草稿.json`, { collection: type, values, editing })}>导出未提交草稿</button></div></details></div><p className="muted">{draftHint} 保存失败时输入保留。</p></fieldset>
      </form></details>}
    {focused && !entryOnly && <div className="actions"><button type="button" className="apple-btn apple-btn-secondary" onClick={() => setViewAll(value => !value)}>{viewAll ? '只看目标记录' : '在本类记录中查看全部'}</button></div>}
    {!entryOnly && (!focused || viewAll) && <>{type === 'swim' && !publicMode && <><Message>成绩按整数毫秒保存，显示分:秒:百分秒；可输入56.171等三位小数，编辑会保留精度。只有核验有效、池长明确的成绩参与PB。未核验、失格和无效记录不会被删除。</Message><Message>测试年龄组按测试年份减出生年份计算；生日未知时留空。排名、上一次成绩和第一名成绩按实际来源填写，缺失时不自动推算。</Message><div className="filter-bar"><label>记录分类<select className="apple-input" value={scoreKind} onChange={e => setScoreKind(e.target.value)}>{['全部', '测试', '比赛', '训练', '未知'].map(kind => <option key={kind}>{kind}</option>)}</select></label><label>距离<select className="apple-input" value={facets.distance} onChange={e => setFacets(current => ({ ...current, distance: e.target.value }))}><option value="">全部</option>{facetOptions('distance').map(option => <option key={option} value={option}>{option}</option>)}</select></label><label>泳姿<select className="apple-input" value={facets.stroke} onChange={e => setFacets(current => ({ ...current, stroke: e.target.value }))}><option value="">全部</option>{facetOptions('stroke').map(option => <option key={option} value={option}>{option}</option>)}</select></label><label>池长<select className="apple-input" value={facets.poolLength} onChange={e => setFacets(current => ({ ...current, poolLength: e.target.value }))}><option value="">全部</option>{facetOptions('poolLength').map(option => <option key={option} value={option}>{option}</option>)}</select></label><label>有效性<select className="apple-input" value={facets.validityStatus} onChange={e => setFacets(current => ({ ...current, validityStatus: e.target.value }))}><option value="">全部</option>{facetOptions('validityStatus').map(option => <option key={option} value={option}>{option}</option>)}</select></label></div></>}
    <div className="filter-bar"><label className="search">查找记录<input className="apple-input" value={filter} onChange={e => setFilter(e.target.value)} placeholder="日期、项目或备注"/></label><label>起始日期<input className="apple-input" type="date" value={from} onChange={e => setFrom(e.target.value)}/></label><label>结束日期<input className="apple-input" type="date" value={to} onChange={e => setTo(e.target.value)}/></label></div>
    {hasFilter && <div className="actions"><span className="muted">已应用筛选：当前显示{records.length}条 / 共{data[type].length}条</span><button type="button" className="apple-btn apple-btn-secondary" onClick={clearFilters}>清除筛选</button></div>}
    </>}
    {!entryOnly && <>{!data[type].length ? <Empty>{`尚无${names[type]}记录；未录入不代表没有训练。`}</Empty> : !records.length ? <Empty>没有符合当前筛选条件的记录。<button type="button" className="apple-btn apple-btn-secondary" onClick={clearFilters}>清除筛选</button></Empty> : null}
    <div className="record-list">{records.map(r => <article className="glass-card" key={r.id}><div className="flex-between"><h2>{dateFormat(r.date || r.deadline)} · {type === 'swim' ? `${r.distance}${r.stroke} ${performanceLabel(r)}${readablePerformance(r) ? `（${readablePerformance(r)}）` : ''} · ${r.poolLength}池` : type === 'goals' ? '个人目标原始记录' : names[type]}</h2>{!readOnly && <div className="actions"><button onClick={() => edit(r)}>编辑</button><button onClick={() => remove(r.id)}>移入回收站</button></div>}</div>
      {type === 'swim' && !publicMode && <p className="muted">{r.startType || '出发未知'} · {r.timingMethod || '计时未知'} · {r.recordType || '记录性质未知'} · {validityLabel(r)}</p>}
      {type === 'swim' && !publicMode && r.timeMs !== undefined && <p className="muted">精确计时：{(performanceMilliseconds(r) / 1000).toFixed(3)}秒 · 录入值：{r.timeInput || r.time}</p>}
      {type === 'swim' && !publicMode && r.conditionsKeptUnknownAt && <p className="muted">计时条件已按未知保留（{r.conditionsKeptUnknownAt}，裁决人：{r.conditionsKeptUnknownBy}）；成绩数值、有效性与PB参与规则不变。</p>}
      {type === 'swim' && !publicMode && !readOnly && missingScoreConditions(r).length > 0 && !r.conditionsKeptUnknownAt && <KeepUnknown record={r} api={api} onSaved={onSaved}/>}
      <details><summary>{type === 'goals' ? '查看原始目标（规则待复核）' : publicMode ? '查看成绩条件' : '查看完整字段与来源'}</summary><dl className="record-fields">{displayFields.map(f => <div key={f.key}><dt>{f.label}</dt><dd>{type === 'growth' && BODY_FIELDS.includes(f.key) ? bodyFormat(r[f.key]) : f.type === 'date' ? dateFormat(r[f.key]) : valueLabel(r[f.key])}</dd></div>)}<div><dt>记录ID</dt><dd>{r.id}</dd></div></dl></details>
      {type === 'swim' && !publicMode && <dl className="record-fields"><div><dt>测试年龄组</dt><dd>{valueLabel(effective.swim.find(s => s.id === r.id)?.testAgeGroup)}</dd></div><div><dt>与第一名差距</dt><dd>{valueLabel(effective.swim.find(s => s.id === r.id)?.gapTime)}</dd></div><div><dt>关联照片 / 视频</dt><dd>{data.media.filter(m => m.recordId === r.id).map(m => m.title).join('、') || '未关联（请在素材说明中选择关联记录）'}</dd></div></dl>}
      {type === 'swim' && !publicMode && <StandardNote record={r} sex={data.profile.sex}/>}
    </article>)}</div></>}
  </div>;
}
function KeepUnknown({ record, api, onSaved }) {
  const [name, setName] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const save = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const saved = await api.request(`/api/swim/${record.id}`, { method: 'PUT', body: { conditionsKeptUnknownAt: today(), conditionsKeptUnknownBy: name }, expectedRevision: api.getRevision() });
      onSaved('swim', saved);
    } catch (problem) { setError(String(problem?.message || '').includes('不支持的字段') ? '云端API尚未部署到支持“按未知保留”的版本，此操作暂不可用；已填内容保留，请稍后由管理员部署最新API后重试。' : problem.message); } finally { setBusy(false); }
  };
  return <details className="keep-unknown"><summary>计时条件确实未知？</summary>
    <p className="muted">当前缺失：{missingScoreConditions(record).map(scoreConditionLabel).join('、')}。核对原始来源后仍无法确认时，可按未知保留：这条记录不再出现在“计时条件缺失”待办；条件字段保持未知，成绩数值、有效性与PB参与规则不变，且保留裁决记录。</p>
    <form onSubmit={save} className="actions"><label className="form-group">裁决人<input className="apple-input" value={name} onChange={e => setName(e.target.value)} required maxLength={50}/></label><button className="apple-btn apple-btn-secondary" disabled={busy}>{busy ? '正在保存…' : '确认按未知保留'}</button></form>
    <Message error>{error}</Message>
  </details>;
}
function StandardNote({ record, sex }) {
  if (!eligiblePerformance(record)) return <p className="muted">当前成绩未核验有效或池长未知，不匹配等级参考线。</p>;
  if (sex !== '女') return <p className="muted">{sex ? '当前内置的已复核表仅覆盖女子50米项目，请查官方完整标准。' : '运动员性别未确认，暂不匹配等级参考线。'} <a href={STANDARD_SOURCE} target="_blank" rel="noreferrer">官方标准</a></p>;
  const lines = record.distance === '50m' && WOMEN_50[record.stroke]?.[record.poolLength];
  return <p className="muted">{lines ? `女子${record.poolLength}池参考：${Object.entries(lines).map(([level, seconds]) => `${level}${seconds.toFixed(2)}秒`).join('；')}。` : '此项目暂未配置已复核参考线。'} 达线、赛事授级条件和获得证书是独立状态。<a href={STANDARD_SOURCE} target="_blank" rel="noreferrer">官方标准（{STANDARD_VERSION}）</a></p>;
}
