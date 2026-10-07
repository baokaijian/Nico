import { downloadJSON, today } from '../services/files';
import { useEffect, useState } from 'react';
import { FIELDS, ordered, validateRecord, WOMEN_50, STANDARD_SOURCE, STANDARD_VERSION } from '../../shared/domain.mjs';
import { Field, Message, Empty } from './ui';
const names = { swim: '成绩', trainings: '水上训练', fitness: '体能', nutrition: '恢复与饮食', growth: '身体测量', goals: '个人目标', annotations: '录像批注', media: '素材说明' };
function valueLabel(value) { return value === true ? '按既有专业建议服用' : value === false ? '未服用' : value == null || value === '' ? '未填写' : String(value); }
export default function Records({ type, data, api, onSaved, readOnly = false, allowAdd = true, publicMode = false }) {
  const fields = FIELDS[type];
  const displayFields = publicMode ? fields.filter(f => ['date', 'distance', 'stroke', 'time', 'poolLength'].includes(f.key)) : fields;
  const blank = () => Object.fromEntries(fields.map(f => [f.key, f.key === 'date' ? today() : '']));
  const [values, setValues] = useState(blank), [editing, setEditing] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [filter, setFilter] = useState('');
  const [draftFound, setDraftFound] = useState(null);
  const [baseRevision, setBaseRevision] = useState(() => api?.getRevision()), [conflict, setConflict] = useState(false);
  const key = `nico_form_draft_${type}`;
  useEffect(() => { try { setDraftFound(JSON.parse(localStorage.getItem(key) || 'null')); } catch { setError('本地草稿无法读取，可继续使用服务端数据'); } }, [key]);
  const edit = r => { setBaseRevision(api.getRevision()); setConflict(false); setEditing(r.id); setValues(Object.fromEntries(fields.map(f => [f.key, r[f.key] ?? '']))); setError(''); };
  const change = (field, value) => {
    setValues(current => { const next = { ...current, [field]: value }; try { localStorage.setItem(key, JSON.stringify({ values: next, editing, baseRevision })); } catch { setError('无法暂存草稿，请导出后继续'); } return next; });
  };
  const reset = () => { setBaseRevision(api.getRevision()); setConflict(false); setEditing(null); setValues(blank()); setError(''); setDraftFound(null); localStorage.removeItem(key); };
  const save = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const previous = editing ? data[type].find(r => r.id === editing) : null;
      validateRecord(type, values, previous);
      const saved = await api.request(`/api/${type}${editing ? `/${editing}` : ''}`, { method: editing ? 'PUT' : 'POST', body: values, expectedRevision: baseRevision });
      onSaved(type, saved); reset();
    } catch (problem) { setError(problem.message); setConflict(problem.status === 409); } finally { setBusy(false); }
  };
  const remove = async id => {
    if (!window.confirm('移入回收站？可以在档案页恢复。')) return;
    try { await api.request(`/api/${type}/${id}`, { method: 'DELETE' }); onSaved(type, null, id); } catch (problem) { setError(problem.message); }
  };
  const records = ordered(data[type]).reverse().filter(r => !filter || JSON.stringify(r).includes(filter));
  const sessionOptions = data.plans.flatMap(p => (p.sessions || []).map(s => ({ id: `${p.id}/${s.id}`, label: `${s.date} · ${s.title || s.type} · ${p.title} v${p.version}` })));
  const uiField = field => {
    const choices = field.key === 'plannedSessionId' ? sessionOptions : field.key === 'mediaId' ? data.media.map(m => ({ id: m.id, label: `${m.date} · ${m.title} · 尾号${m.id.slice(-4)}` })) : field.key === 'recordId' ? [...data.swim, ...data.trainings].map(r => ({ id: r.id, label: `${r.date} · ${r.distance || r.session || '训练'} ${r.time || ''}` })) : null;
    return choices ? { ...field, type: 'select', options: choices.map(o => o.id), optionLabels: Object.fromEntries(choices.map(o => [o.id, o.label])) } : field;
  };
  const simpleKeys = type === 'trainings' ? ['date', 'plannedSessionId', 'durationMinutes', 'totalMeters', 'feeling', 'discomfort', 'coachNotes'] : type === 'nutrition' ? ['date', 'sleepHours', 'fatigue', 'discomfort', 'willingness'] : fields.map(f => f.key);
  return <div className="stack"><header><h1>{names[type]}记录</h1><p className="muted">{publicMode ? '仅展示家长已确认公开的成绩，按距离、泳姿与池长分别查看。' : readOnly ? '查看实际录入的记录，未填写的字段表示未知。' : '填写实际观察；留空表示未记录，0只表示实际为零。'}</p></header>
    {type === 'fitness' && <Message>目前只做个人测量记录。体能值不能替代游泳等级标准；具体训练由教练确认。</Message>}
    {type === 'nutrition' && <Message>记录实际睡眠、感受和饮食。晨脉与恢复感受不用于自动判断能否下水；补充剂仅记录既有专业建议。</Message>}
    {type === 'goals' && <Message>历史目标原文完整保留，包含未核实的规则或旧标准。手动进度不代表预测概率；未经确认的原文不作为训练指令。</Message>}
    <Message error>{error}</Message>{conflict && <Message>请先用顶部“刷新记录”读取最新版本，对照下方记录。<button onClick={() => { setBaseRevision(api.getRevision()); setConflict(false); setError('已采用当前版本，请确认输入后再次保存'); }}>已核对最新记录，允许重试</button></Message>}
    {!readOnly && (allowAdd || editing) && <details className="glass-card" open={Boolean(editing)}><summary>{editing ? '编辑记录' : '添加记录'}</summary>
      {draftFound && <Message>发现此设备的未提交草稿。<button onClick={() => { setValues(draftFound.values); setEditing(draftFound.editing); setBaseRevision(draftFound.baseRevision ?? 0); setDraftFound(null); }}>恢复草稿</button> <button onClick={() => { localStorage.removeItem(key); setDraftFound(null); }}>舍弃草稿</button></Message>}
      <form onSubmit={save}><div className="form-grid">{fields.filter(f => simpleKeys.includes(f.key)).map(field => <Field key={field.key} field={uiField(field)} value={values[field.key]} onChange={v => change(field.key, v)}/>)}</div>{simpleKeys.length < fields.length && <details><summary>补充详细字段（可选）</summary><div className="form-grid">{fields.filter(f => !simpleKeys.includes(f.key)).map(field => <Field key={field.key} field={uiField(field)} value={values[field.key]} onChange={v => change(field.key, v)}/>)}</div></details>}
        <div className="actions"><button disabled={busy} className="apple-btn apple-btn-primary">{busy ? '正在保存…' : '保存到服务端'}</button><button type="button" onClick={reset} className="apple-btn apple-btn-secondary">清空 / 取消</button><button type="button" onClick={() => downloadJSON(`Nico-${type}-未提交草稿.json`, { collection: type, values, editing })} className="apple-btn apple-btn-secondary">导出未提交草稿</button></div><p className="muted">草稿仅在此设备，不会自动覆盖服务端。保存失败时输入保留。</p>
      </form></details>}
    <label className="search">查找记录<input className="apple-input" value={filter} onChange={e => setFilter(e.target.value)} placeholder="日期、项目或备注"/></label>
    {!records.length && <Empty>{publicMode ? '尚无已选择的公开成绩，或没有符合查找条件的成绩。' : '尚无匹配记录；未录入不代表没有训练。'}</Empty>}
    <div className="record-list">{records.map(r => <article className="glass-card" key={r.id}><div className="flex-between"><h2>{r.date || r.deadline || '未填写日期'} · {type === 'swim' ? `${r.distance}${r.stroke} ${r.time} · ${r.poolLength}池` : type === 'goals' ? '个人目标原始记录' : names[type]}</h2>{!readOnly && <div className="actions"><button onClick={() => edit(r)}>编辑</button><button onClick={() => remove(r.id)}>移入回收站</button></div>}</div>
      {type === 'swim' && !publicMode && <p className="muted">{r.startType || '出发未知'} · {r.timingMethod || '计时未知'} · {r.recordType || '记录性质未知'}</p>}
      <details><summary>{type === 'goals' ? '查看原始目标（规则待复核）' : publicMode ? '查看成绩条件' : '查看完整字段与来源'}</summary><dl className="record-fields">{displayFields.map(f => <div key={f.key}><dt>{f.label}</dt><dd>{valueLabel(r[f.key])}</dd></div>)}<div><dt>记录ID</dt><dd>{r.id}</dd></div></dl></details>
      {type === 'swim' && !publicMode && <StandardNote record={r} sex={data.profile.sex}/>}
    </article>)}</div>
  </div>;
}
function StandardNote({ record, sex }) {
  if (sex !== '女') return <p className="muted">{sex ? '当前内置的已复核表仅覆盖女子50米项目，请查官方完整标准。' : '运动员性别未确认，暂不匹配等级参考线。'} <a href={STANDARD_SOURCE} target="_blank" rel="noreferrer">官方标准</a></p>;
  const lines = record.distance === '50m' && WOMEN_50[record.stroke]?.[record.poolLength];
  return <p className="muted">{lines ? `女子${record.poolLength}池参考：${Object.entries(lines).map(([level, seconds]) => `${level}${seconds.toFixed(2)}秒`).join('；')}。` : '此项目暂未配置已复核参考线。'} 达线、赛事授级条件和获得证书是独立状态。<a href={STANDARD_SOURCE} target="_blank" rel="noreferrer">官方标准（{STANDARD_VERSION}）</a></p>;
}
