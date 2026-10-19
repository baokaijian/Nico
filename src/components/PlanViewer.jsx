import { downloadJSON, today } from '../services/files';
import { useMemo, useState } from 'react';
import { FIELDS, analysis, validateRecord, fingerprint, planContext, rangeSummary } from '../../shared/domain.mjs';
import { EVIDENCE_COLLECTIONS, PLAN_DRAFT_ID, planDimensions, VOLUME_WINDOW_DAYS, RECOVERY_WINDOW_DAYS } from '../../shared/plan-engine.mjs';
import RecordSources from './RecordSources';
import { Field, Message, Empty } from './ui';
const evidenceLabels = { swim: '成绩', trainings: '水上训练', growth: '身体测量', fitness: '体能', nutrition: '恢复与饮食', goals: '个人目标', media: '素材', annotations: '录像批注' };
const ruleLabels = { 'R-PB': '个人最好成绩变化', 'R-GOAL': '目标差距', 'R-VOL': '训练量窗口变化', 'R-REC': '恢复警示', 'R-SLEEP': '睡眠变化', 'R-RPE': '主观用力偏高', 'R-FOCUS': '重点候选', 'R-EXEC': '执行覆盖率', 'R-GROWTH': '身体测量' };
function weekBounds(day) {
  const base = new Date(`${day}T00:00:00Z`);
  const start = new Date(base);
  start.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}
function Dimension({ title, status = 'ok', value, detail, threshold, ids, data }) {
  return <article className="metric-card"><h3>{title}</h3>{status === 'insufficient'
    ? <><p className="muted">{value}</p>{threshold && <small>生成门槛：{threshold}</small>}</>
    : <><p>{value}</p>{detail && <p className="muted">{detail}</p>}</>}
    <RecordSources data={data} ids={ids || []}/></article>;
}
export default function PlanViewer({ data, api, onSaved, readOnly, navigate }) {
  const result = useMemo(() => analysis(data), [data]);
  const context = useMemo(() => planContext(data, today(), result.version), [data, result.version]);
  const dimensions = useMemo(() => planDimensions(data), [data]);
  const draft = data.plans.find(p => p.id === PLAN_DRAFT_ID) || null;
  const manualPlans = data.plans.filter(p => p.id !== PLAN_DRAFT_ID);
  const [weekStart, weekEnd] = weekBounds(today());
  const coverage = useMemo(() => rangeSummary(data, weekStart, weekEnd), [data, weekStart, weekEnd]);
  const blank = () => Object.fromEntries(FIELDS.plans.map(f => [f.key, '']));
  const [form, setForm] = useState(blank), [sessions, setSessions] = useState([]), [editing, setEditing] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [baseRevision, setBaseRevision] = useState(() => api.getRevision()), [conflict, setConflict] = useState(false);
  const [formOpen, setFormOpen] = useState(false), [selectedPlanId, setSelectedPlanId] = useState('');
  const displayedPlan = context.candidates.find(p => p.id === selectedPlanId) || (selectedPlanId ? null : context.current);
  const update = (i, key, value) => setSessions(current => current.map((s, n) => n === i ? { ...s, [key]: value } : s));
  const payload = () => ({ ...form, sessions, sourceIds: result.sourceIds, sourceVersion: result.version });
  const startFromDraft = () => {
    setEditing(null); setSessions([]); setError(''); setConflict(false); setBaseRevision(api.getRevision());
    setForm({ ...blank(), title: `依据记录生成的周期计划（${dimensions.period.start}起）`, startDate: dimensions.period.start, endDate: dimensions.period.end, focus: result.focus, status: '草稿', reviewedBy: '', notes: '' });
    setFormOpen(true);
  };
  const editPlan = p => { setBaseRevision(api.getRevision()); setConflict(false); setEditing(p.id); setForm(Object.fromEntries(FIELDS.plans.map(f => [f.key, p[f.key] ?? '']))); setSessions(structuredClone(p.sessions || [])); setFormOpen(true); };
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { const previous = data.plans.find(p => p.id === editing); validateRecord('plans', payload(), previous); const saved = await api.request(`/api/plans${editing ? `/${editing}` : ''}`, { method: editing ? 'PUT' : 'POST', body: payload(), expectedRevision: baseRevision }); onSaved('plans', saved); setForm(blank()); setSessions([]); setEditing(null); setBaseRevision(api.getRevision()); setFormOpen(false); } catch (problem) { setError(problem.message); setConflict(problem.status === 409); } finally { setBusy(false); }
  };
  const triggered = dimensions.rules.filter(rule => rule.triggered);
  const volume = dimensions.volume, intensity = dimensions.intensity;
  return <div className="stack fade-in"><header><h1>本周与训练提升计划</h1><p className="muted">依据当前记录生成的4周管理建议；具体组数、强度、休息由现场教练安排。</p></header>
    <section className="glass-card"><h2>{displayedPlan ? '本周期确认重点' : '待教练确认的重点'}：{displayedPlan?.focus || result.focus}</h2><Message>{context.message}</Message>
      {context.candidates.length > 1 && <fieldset className="glass-card"><legend>选择本周期采用的确认计划</legend>{context.candidates.map(p => <label key={p.id}><input type="radio" name="active-plan" checked={displayedPlan?.id === p.id} onChange={() => setSelectedPlanId(p.id)}/> {p.title} · 版本{p.version} · {p.startDate}—{p.endDate} · 确认人{p.reviewedBy || '未填写'}</label>)}<p className="muted">重叠周期须由教练明确采用哪一份；此处选择仅用于查看，不改变记录内容。</p></fieldset>}
      {displayedPlan && <p>{displayedPlan.title} · 版本{displayedPlan.version} · 确认人{displayedPlan.reviewedBy} · {displayedPlan.startDate}—{displayedPlan.endDate}</p>}
      {displayedPlan && context.stale.some(p => p.id === displayedPlan.id) && <Message>此计划的依据已更新（{displayedPlan.sourceVersion} → {result.version}），请教练复核后保存新版本。</Message>}
      {result.focusEvidence ? <><p>建议依据：{result.focusEvidence.kind} · {result.focusEvidence.date} · {result.focusEvidence.text}</p><RecordSources data={data} ids={result.focusEvidence.sourceIds}/></> : <p>尚无技术反馈或审核观察，先由教练确认重点。</p>}<p className="muted">备注与原话仅供复核；不据关键词诊断体能，不相加提速秒数，不把25米乘2换算50米。</p></section>
    <section className="glass-card"><h2>本周执行覆盖率（{weekStart}—{weekEnd}）</h2>{coverage.plannedCount == null
      ? <Empty>本周没有可作为分母的已确认计划课次，覆盖率无法计算。</Empty>
      : <><p>本周已确认计划课次{coverage.plannedCount}次；其中{coverage.coverage}%已有实际训练记录通过"关联计划课次ID"对应。</p><p className="muted">覆盖率只反映已录入记录的对应关系；未录入训练不代表没有训练。</p></>}</section>
    <section className="glass-card"><h2>训练提升计划草稿（自动生成）</h2><p className="muted">每次保存成绩、训练、体能、恢复等记录后，平台在同一事务内按规则重算本草稿。所有数值均来自已录入记录，并标注依据；草稿不含任何具体组表。</p>
      {!draft ? <Empty>尚无成绩记录，计划草稿不会生成。录入第一条真实成绩后自动生成。<button type="button" className="apple-btn apple-btn-secondary" onClick={() => navigate?.('records', 'swim')}>去录入成绩</button></Empty> : <>
        <p>生成引擎：{draft.generatedBy.engine} · 草稿版本{draft.version} · 生成时间{draft.generatedBy.generatedAt} · 触发记录：{draft.generatedBy.triggeredByRecordId || '未单独记录'}</p>
        <p>数据范围：{draft.generatedBy.dataRange.start || '无'}—{draft.generatedBy.dataRange.end || '无'}（{EVIDENCE_COLLECTIONS.filter(key => draft.generatedBy.dataRange.counts?.[key]).map(key => `${evidenceLabels[key]}${draft.generatedBy.dataRange.counts[key]}条`).join('、') || '无记录'}）</p>
        {draft.generatedBy.manualEdited && <Message>此草稿已被人工编辑，后续录入记录不会再自动覆盖它；下方维度为按当前记录实时重算的参考，如需固定请"以此草稿创建计划"保存新版本。</Message>}
        {!draft.generatedBy.manualEdited && draft.generatedBy.evidenceVersion !== result.version && <Message>记录已更新（草稿依据{draft.generatedBy.evidenceVersion}，当前{result.version}）；服务端会在下一次写入时重算，下方为当前实时重算结果。</Message>}
        <div className="draft-grid">
          <Dimension title="周期划分" value={`${dimensions.period.start} — ${dimensions.period.end}，共${dimensions.period.weeks}周`} detail={`${dimensions.period.ranges.map((range, i) => `W${i + 1} ${range.start}—${range.end}`).join('；')}。起止日期由生成时的系统日期推算，不是运动员数据；教练填写正式计划时可改。`} data={data} ids={[]}/>
          <Dimension title="阶段目标" value={triggered.find(rule => rule.id === 'R-GOAL')?.text || result.focus} detail={`四周语义不变：确认基线 → 记录执行 → 录像验证 → 复测调整。当前候选重点：${result.focus}。`} data={data} ids={dimensions.rules.filter(rule => rule.id === 'R-GOAL' || rule.id === 'R-FOCUS').flatMap(rule => rule.sourceIds)}/>
          <Dimension title="训练量参考区间" status={volume.status} data={data} ids={volume.sourceIds} threshold={volume.threshold} value={volume.status === 'ok'
            ? `参考区间 ${volume.referenceRange[0]}—${volume.referenceRange[1]}m / 活跃周（近${VOLUME_WINDOW_DAYS / 7}周实测周均${volume.averagePerActiveWeek}m）`
            : `训练量参考区间数据不足：当前近${VOLUME_WINDOW_DAYS / 7}周${volume.records}条训练记录、${volume.weeks}个不同周。不生成训练量建议。`}
            detail={volume.status === 'ok' ? `${volume.windowStart}—${volume.windowEnd}实际泳程合计${volume.meterTotal}m，其中打腿${volume.kickTotal}m${volume.kickRatio == null ? '' : `（占比${Math.round(volume.kickRatio * 100)}%）`}；${volume.previousAverage == null ? '上一窗口数据不足，暂不比较变化。' : `上一窗口（${volume.previousWindowStart}—${volume.previousWindowEnd}）周均${volume.previousAverage}m。`}区间为±10%参考带，是否加量由教练确认。` : undefined}/>
          <Dimension title="强度安排观察" status={intensity.status} data={data} ids={intensity.sourceIds} threshold={intensity.threshold} value={intensity.status === 'ok'
            ? `近${RECOVERY_WINDOW_DAYS / 7}周恢复记录${intensity.recoveryCount}条；近${VOLUME_WINDOW_DAYS / 7}周含主观用力感的训练${intensity.rpeCount}条${intensity.rpeAverage == null ? '' : `，均值${intensity.rpeAverage}`}。`
            : `强度数据不足：近${RECOVERY_WINDOW_DAYS / 7}周恢复记录${intensity.recoveryCount}条，含RPE训练${intensity.rpeCount}条。强度仅展示已录入观察，不作安排建议。`}
            detail={intensity.warnings.length ? '触发的观察（见下方命中规则）：' + intensity.warnings.map(warning => `${ruleLabels[warning.id] || warning.id}`).join('、') : '未触发降档相关观察；强度档位与具体安排仍由教练决定。'}/>
          <Dimension title="恢复与休息观察" status={intensity.recoveryCount ? 'ok' : 'insufficient'} data={data} ids={intensity.sourceIds} threshold={`需要近${RECOVERY_WINDOW_DAYS / 7}周≥1条恢复与饮食记录`} value={intensity.recoveryCount
            ? `近${RECOVERY_WINDOW_DAYS / 7}周恢复记录${intensity.recoveryCount}条${dimensions.rules.filter(rule => ['R-REC', 'R-SLEEP'].includes(rule.id) && rule.triggered).length ? '；存在需要留置意的观察，见命中规则。' : '；未触发需留置意的观察。'}`
            : `近${RECOVERY_WINDOW_DAYS / 7}周尚无恢复与饮食记录，休息安排未评估。`}
            detail="休息课次与恢复安排只能由教练填写；平台仅提示已录入的恢复观察。"/>
          <Dimension title="执行偏差观察" value={dimensions.rules.find(rule => rule.id === 'R-EXEC')?.text || '执行覆盖率暂不计算。'} detail={`统计口径与复盘报告一致，阈值见门槛说明：${dimensions.rules.find(rule => rule.id === 'R-EXEC')?.threshold || '—'}`} data={data} ids={dimensions.rules.find(rule => rule.id === 'R-EXEC')?.sourceIds || []}/>
        </div>
        <details><summary>命中规则与生成门槛（{triggered.length}/{dimensions.rules.length}条已触发）</summary><div className="rule-list">{dimensions.rules.map(rule => <article className="rule-item" key={rule.id}><span className="badge">{ruleLabels[rule.id] || rule.id} · {rule.triggered ? '已触发' : '未触发'}</span><p>{rule.text || '未触发，无输出。'}</p><small>门槛：{rule.threshold}</small><RecordSources data={data} ids={rule.sourceIds}/></article>)}</div></details>
        {(draft.generatedBy.history?.length || 0) > 0 && <details><summary>草稿更新历史（最近5次）</summary><ul className="data-list">{draft.generatedBy.history.slice(-5).reverse().map((entry, index) => <li key={`${entry.triggeredAt}-${index}`}>{entry.triggeredAt} · 依据{entry.evidenceVersion} · 命中{(entry.rules || []).map(id => ruleLabels[id] || id).join('、') || '无'}</li>)}</ul></details>}
        <div className="actions">{!readOnly && <button className="apple-btn apple-btn-primary" onClick={startFromDraft}>以此草稿创建计划</button>}<span className="muted">创建后为新的草稿版本（自动生成槽位保留），课次与组表仍需教练填写。</span></div>
      </>}</section>
    <section className="glass-card"><h2>已录入参考成绩与基线缺口</h2><p>{result.baseline.text}</p><p>{result.baseline.missingConditions.length ? `待补齐：${result.baseline.missingConditions.join('、')}。` : result.baseline.recordId ? '已填条件仍需现场确认，参考成绩尚未自动认定为本周期基线。' : '没有参考成绩时不生成基线数值。'}</p><RecordSources data={data} ids={result.baseline.recordId ? [result.baseline.recordId] : []}/></section>
    <p className="muted">以下四周为记录、验证和复盘的建议流程，尚未执行；具体日期、课次和练习量由教练填写。与上方草稿相互独立：草稿提供数值参考，此处为流程建议。</p>
    <div className="stage-grid">{result.stages.map(stage => <article className="glass-card" key={stage.title}><h2>{stage.title}</h2><p>{stage.action}</p><p className="muted">交付：{stage.delivery}</p><RecordSources data={data} ids={stage.sourceIds}/><p><span className="badge">建议草稿 · 待教练确认</span></p></article>)}</div>
    <section className="glass-card"><h2>执行与恢复边界</h2><ul className="data-list"><li>不安排家庭水下憋气任务或强制限气口令，水下技能须有合格现场监督。</li><li>家庭额外活动计入总负荷。具体运动由教练确认；有疼痛、不适、反复疲惫或厌训时先沟通。</li><li>记录实际课表与休息日；不因年龄或网页模板自动追加每天的弹跳、拉伸和补充剂。</li><li>长池50米没有半程转身；短池相关技术单独记录。</li></ul><p className="muted">资料：<a href="https://www.redcross.org/content/dam/redcross/training-services/scientific-advisory-council/2022%20Hypoxic%20Blackout%20-%20Joint%20Statement%20-%20Red%20Cross%20Y%20USA%20Swimming%2010-31-2022.pdf" target="_blank" rel="noreferrer">水上呼吸安全联合声明</a> · <a href="https://publications.aap.org/pediatrics/article/153/2/e2023065129/196435" target="_blank" rel="noreferrer">AAP儿童运动负荷资料</a> · <a href="https://aasm.org/advocacy/position-statements/child-sleep-duration-health-advisory/" target="_blank" rel="noreferrer">睡眠参考</a></p></section>
    <h2>已保存的周期与课次</h2>{!manualPlans.length && <Empty>尚无人工保存的计划；以上草稿与建议没有被当作已执行课表。</Empty>}
    {manualPlans.map(p => <PlanCard key={p.id} plan={p} stale={p.sourceVersion && p.sourceVersion !== result.version} onEdit={readOnly ? null : () => editPlan(p)}/>)}
    {draft && <details className="glass-card"><summary>查看自动生成草稿槽位的原始记录</summary><PlanCard plan={draft} stale={draft.sourceVersion && draft.sourceVersion !== result.version}/><p className="muted">此槽位由服务端维护：每次保存证据集合后自动重算；被人工编辑后不再自动覆盖。</p></details>}
    {!readOnly && <details className="glass-card" open={formOpen || Boolean(editing)} onToggle={e => setFormOpen(e.target.open)}><summary>{editing ? '编辑计划并保存新版本' : '创建计划与课次'}</summary><Message error>{error}</Message>{conflict && <Message>刷新记录并核对当前计划后，<button onClick={() => { setBaseRevision(api.getRevision()); setConflict(false); }}>使用已核对的新版本重试</button></Message>}{draft && <button type="button" onClick={startFromDraft}>以此草稿创建计划（预填周期与重点）</button>}<form onSubmit={submit}><div className="form-grid">{FIELDS.plans.map(f => <Field key={f.key} field={f} value={form[f.key]} onChange={value => setForm(current => ({ ...current, [f.key]: value }))}/>)}</div>
      <h3>课次与组表（填写教练安排，不自动生成泳程）</h3>{sessions.map((s, i) => <fieldset key={s.id}><legend>课次{i + 1}</legend><div className="form-grid"><Field field={{ key: 'date', label: '日期', type: 'date', required: true }} value={s.date} onChange={v => update(i, 'date', v)}/><Field field={{ key: 'type', label: '类型', type: 'select', options: ['训练', '休息', '待确认'], required: true }} value={s.type} onChange={v => update(i, 'type', v)}/><Field field={{ key: 'title', label: '名称', type: 'text' }} value={s.title} onChange={v => update(i, 'title', v)}/><Field field={{ key: 'durationMinutes', label: '计划时长（分钟）', type: 'number', min: 0, max: 600 }} value={s.durationMinutes} onChange={v => update(i, 'durationMinutes', v)}/><Field field={{ key: 'poolLength', label: '池长', type: 'select', options: ['25m', '50m'] }} value={s.poolLength} onChange={v => update(i, 'poolLength', v)}/><Field field={{ key: 'startType', label: '出发方式', type: 'select', options: ['跳台', '蹬壁', '水中', '未知'] }} value={s.startType} onChange={v => update(i, 'startType', v)}/></div>
        {s.sets.map((g, n) => <div className="set-row" key={n}>{[['task', '任务', 'text'], ['repeats', '次数', 'number'], ['distance', '每次距离（m）', 'number'], ['restSeconds', '休息（秒）', 'number']].map(([key, label, type]) => <Field key={key} field={{ key, label, type, required: true, min: key === 'restSeconds' ? 0 : 1 }} value={g[key]} onChange={value => update(i, 'sets', s.sets.map((item, j) => j === n ? { ...item, [key]: value } : item))}/>)}<button type="button" onClick={() => update(i, 'sets', s.sets.filter((_, j) => n !== j))}>移除该组</button></div>)}<div className="actions"><button type="button" onClick={() => update(i, 'sets', [...s.sets, { task: '', repeats: '', distance: '', restSeconds: '' }])}>添加组</button><span>已填写总量：{s.sets.reduce((total, g) => total + Number(g.repeats || 0) * Number(g.distance || 0), 0)}m</span><button type="button" onClick={() => setSessions(current => current.filter((_, n) => n !== i))}>移除课次</button></div></fieldset>)}
      <div className="actions"><button type="button" onClick={() => setSessions(current => [...current, { id: `session-${Date.now()}-${current.length}`, date: '', type: '', title: '', durationMinutes: '', poolLength: '', startType: '', sets: [] }])}>添加课次 / 休息日</button><button disabled={busy} className="apple-btn apple-btn-primary">{busy ? '保存中…' : '保存计划版本'}</button><button type="button" onClick={() => downloadJSON('Nico-计划草稿.json', payload())}>导出草稿</button></div></form></details>}
    {data.planHistory?.length > 0 && <details className="glass-card"><summary>查看历史计划版本（每份人工计划保留最近版本）</summary>{data.planHistory.map((p, i) => <PlanCard key={`${p.id}-${p.version}-${i}`} plan={p}/>)}</details>}
  </div>;
}
export function PlanCard({ plan: p, onEdit, stale }) { return <article className="glass-card"><div className="flex-between"><h2>{p.title} · 版本{p.version}</h2>{onEdit && <button onClick={onEdit}>编辑新版本</button>}</div><p>{p.startDate}—{p.endDate} · {p.status} · 确认人：{p.reviewedBy || '未填写'}</p>{p.id === PLAN_DRAFT_ID && <p className="muted">自动生成槽位 · 引擎{p.generatedBy?.engine || '未知'} · 依据{p.generatedBy?.evidenceVersion || '未记录'}{p.generatedBy?.manualEdited ? ' · 已被人工编辑' : ''}</p>}<h3>{p.focus}</h3>{stale && <Message>依据记录已更新，请教练复核本计划；旧版本仍保留。</Message>}{(p.sessions || []).map(s => <section className="session" key={s.id}><h3>{s.date} · {s.type} · {s.title}</h3><p>课次ID：{p.id}/{s.id} · 时长：{s.durationMinutes ?? '未填'}分钟 · {s.poolLength || '池长未填'} · {s.startType || '出发未填'}</p><ul>{s.sets.map((g, i) => <li key={i}>{g.task}：{g.repeats}×{g.distance}m，休息{g.restSeconds}s</li>)}</ul><strong>组表总量：{s.totalMeters ?? '未填写'}m</strong></section>)}{!(p.sessions || []).length && <p className="muted">草稿未含课次与组表；组数、距离与休息秒数由教练填写。</p>}<p className="muted">来源：{p.sourceVersion || '手动计划'} · {(p.sourceIds || []).join('、') || '尚未关联记录'} · 内容校验标识{fingerprint(p)}</p></article>; }
