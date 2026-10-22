import { lazy, Suspense, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { FIELDS } from '../../shared/domain.mjs';
import { practiceOverview, growthTimeline, PRACTICE_ENGINE_VERSION } from '../../shared/practice.mjs';
import { planDimensions } from '../../shared/plan-engine.mjs';
import { today } from '../services/files';
import { Empty, Message } from './ui';
import RecordSources from './RecordSources';
import useGrowthForm from '../services/useGrowthForm';
import { GrowthForm } from './GrowthUI';
import { skillWorkspace } from '../services/growth-workspace';
const pointDefaults = () => ({ date: today(), title: '', category: '技术动作', sourceType: '教练反馈原话', sourceRef: '', evidence: '', targetPerWeek: '', drillHint: '', status: '待确认', recordedBy: '', notes: '' });
const checkinDefaults = () => ({ date: today(), weakPointId: '', times: '', durationMinutes: '', quality: '', childFeeling: '', notes: '', recordedBy: '' });

const Skills = lazy(() => import('./Skills'));
const splitRefs = value => String(value || '').split(/[,，、\s]+/).filter(Boolean);
const statusHint = { 待确认: '待家长依据教练反馈核对', 练习中: '当前打卡目标', 已改善: '保留记录，不再计入周目标', 暂停: '暂不打卡，保留历史' };

export default function Practice({ data, api, onSaved, readOnly = false, navigate, manageSkills = true, embedded = false, focusedSkillId, initialAssessment, onRetest, initialSection = 'practice' }) {
  const [section, setSection] = useState(initialSection), [retestSeed, setRetestSeed] = useState(null);
  const scoped = useMemo(() => { if (!embedded) return data; const model = skillWorkspace(data, focusedSkillId); return { ...data, weakpoints: model.points, checkins: model.checkins }; }, [data, embedded, focusedSkillId]);
  const overview = useMemo(() => practiceOverview(scoped), [scoped]);
  const growth = useMemo(() => growthTimeline(data), [data]);
  const dimensions = useMemo(() => planDimensions(data), [data]);
  const pointFormState = useGrowthForm({ collection: 'weakpoints', defaults: pointDefaults, data, api, onSaved: (...args) => { onSaved(...args); if (args[1]) practice.replace({weakPointId: args[1].id}); }, readOnly });
  const practice = useGrowthForm({ collection: 'checkins', defaults: checkinDefaults, data, api, onSaved, readOnly });
  const checkin = practice.values, pointForm = pointFormState.values, editingPoint = pointFormState.editing;
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const setCheckinField = practice.change, setPointField = pointFormState.change;
  const run = async (task) => {
    setBusy(true); setError(''); setNotice('');
    try { await task(); } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  };
  const removePoint = point => run(async () => {
    if (!window.confirm(`把薄弱点“${point.title}”移入回收站？已有打卡记录时不能删除。`)) return;
    await api.request(`/api/weakpoints/${point.id}`, { method: 'DELETE' });
    onSaved('weakpoints', null, point.id);
  });
  const removeCheckin = record => run(async () => {
    if (!window.confirm('删除这条打卡记录？')) return;
    await api.request(`/api/checkins/${record.id}`, { method: 'DELETE' });
    onSaved('checkins', null, record.id);
  });
  const pointEditor = row => pointFormState.edit(row);
  const quickStatus = (point, status) => run(async () => {
    const saved = await api.request(`/api/weakpoints/${point.id}`, { method: 'PUT', body: { status }, expectedRevision: api.getRevision() });
    onSaved('weakpoints', saved);
  });
  const checkinDates = overview.heatmap.filter(day => day.count).length;
  const startFromAssessment = row => {
    setSection('practice');
    pointFormState.replace({ date: today(), title: `${row.standardSnapshot.name}：待核对的改进点`, category: '技术动作', sourceType: '技能评估', sourceRef: row.id, evidence: row.evidenceNote, targetPerWeek: '', drillHint: row.improvementNote || '', status: '待确认', recordedBy: '', notes: '' });
    setNotice('已带入真实测评来源，请核对短板描述和练习安排后保存。');
  };
  const applyContext = useEffectEvent(seed => startFromAssessment(seed));
  const usedSeed = useRef(null);
  useEffect(() => { if (initialAssessment && usedSeed.current !== initialAssessment.token) { usedSeed.current = initialAssessment.token; applyContext(initialAssessment); } }, [initialAssessment]);
  const tabs = <div className="ctx-tabs" role="group" aria-label="打卡与技能"><button aria-pressed={section === 'practice'} onClick={() => setSection('practice')}>练习打卡</button><button aria-pressed={section === 'skills'} onClick={() => setSection('skills')}>技能测评与标准</button></div>;
  if (section === 'skills') return <div className="stack">{tabs}<Suspense fallback={<Message>正在打开技能记录…</Message>}><Skills data={data} api={api} onSaved={onSaved} readOnly={readOnly || !manageSkills} onCreatePoint={startFromAssessment} retestSeed={retestSeed}/></Suspense></div>;
  return <div className="stack fade-in">{!embedded && tabs}
    <header className="page-header"><div><p className="eyebrow">家长录入 · 依据教练反馈与已录入记录</p><h1>薄弱点打卡练习</h1><p className="muted">平台只把你已经录入的教练反馈、录像观察和成绩变成候选薄弱点；薄弱点与每次打卡都由家长确认后写入，不自动生成、不填充示例。</p></div><button className="apple-btn apple-btn-primary" onClick={() => pointFormState.replace({})} disabled={readOnly}>新增薄弱点</button></header>
    {!embedded && <section className="stat-grid">
      <Stat label="本周打卡次数" value={overview.weekTimes} hint={overview.weekTarget ? `周目标 ${overview.weekTarget} 次 · ${overview.week.start}—${overview.week.end}` : `未设定周目标 · ${overview.week.start}—${overview.week.end}`}/>
      <Stat label="连续打卡" value={overview.streak.days ? `${overview.streak.days}天` : '0天'} hint={overview.streak.days ? `${overview.streak.start}—${overview.streak.end}` : '今天或昨天有打卡才开始计算'}/>
      <Stat label="练习中薄弱点" value={overview.active.length} hint={`共录入 ${overview.points.length} 个薄弱点`}/>
      <Stat label="累计打卡" value={`${overview.total}条`} hint={overview.lastDate ? `最近 ${overview.lastDate}` : '尚无打卡记录'}/>
    </section>}
    <Message error>{error}</Message><Message>{notice}</Message>
    {!overview.points.length ? <section className="glass-card"><h2>还没有薄弱点</h2><Empty>尚未录入薄弱点。薄弱点只能由家长依据教练反馈原话、已审核录像观察或已录入成绩确认；平台不自动生成，也不用推测填充。<button type="button" className="apple-btn apple-btn-secondary" onClick={() => navigate('records', 'trainings')}>先录入教练反馈</button></Empty></section> : <>
      <section className="glass-card"><div className="section-head"><h2>记录一次打卡</h2><p className="muted">只记录已经发生的练习；未完成可填 0 次，留空表示未记录。</p></div>
        {readOnly ? <Empty>当前为只读访问，不能写入打卡。</Empty> : <GrowthForm form={{ ...practice, open: true }} title="本次练习打卡"><div className="form-grid">
          <label>薄弱点<select className="apple-input" value={checkin.weakPointId} onChange={e => setCheckinField('weakPointId', e.target.value)}><option value="">请选择已录入薄弱点</option>{overview.points.map(point => <option key={point.id} value={point.id}>{point.title}（{point.status}）</option>)}</select></label>
          <label>日期<input className="apple-input" type="date" value={checkin.date} onChange={e => setCheckinField('date', e.target.value)}/></label>
          <label>完成次数 / 组数<input className="apple-input" type="number" min="0" max="200" step="1" value={checkin.times} onChange={e => setCheckinField('times', e.target.value)}/></label>
          <label>练习时长（分钟，可不填）<input className="apple-input" type="number" min="0" max="600" value={checkin.durationMinutes} onChange={e => setCheckinField('durationMinutes', e.target.value)}/></label>
          <label>完成质量（家长观察）<select className="apple-input" value={checkin.quality} onChange={e => setCheckinField('quality', e.target.value)}><option value="">请选择实际完成质量</option>{FIELDS.checkins.find(field => field.key === 'quality').options.map(option => <option key={option}>{option}</option>)}</select></label>
          <label>孩子主观感受<input className="apple-input" value={checkin.childFeeling} onChange={e => setCheckinField('childFeeling', e.target.value)} placeholder="原话，可留空"/></label>
          <label className="search">备注<input className="apple-input" value={checkin.notes} onChange={e => setCheckinField('notes', e.target.value)}/></label>
        </div></GrowthForm>}
      </section>
      <section className="glass-card"><div className="section-head"><h2>薄弱点与进度</h2><p className="muted">每条都标注来源与依据原文；周目标由家长填写，未填时不计算完成率。</p></div><div className="rule-list">{overview.points.map(point => <article className="rule-item" key={point.id}>
        <div className="flex-between"><h3>{point.title}</h3><span className="badge">{point.status}</span></div>
        <p className="muted">{point.category} · 来源：{point.sourceType} · {statusHint[point.status] || ''}</p>
        {point.evidence && <p>依据原文：{point.evidence}</p>}
        {point.drillHint && <p>练习方式：{point.drillHint}</p>}
        <p className="muted">本周 {point.weekTimes} 次{point.targetPerWeek ? ` / 目标 ${point.targetPerWeek} 次` : '（未设周目标）'} · 累计 {point.times} 次 · 共打卡 {point.total} 条{point.total ? `（按要求完成 ${point.done} 条）` : ''} · 连续 {point.streak.days} 天 · 最近 {point.lastDate || '未打卡'}</p>
        <RecordSources data={data} ids={splitRefs(point.sourceRef)}/>
        {!readOnly && manageSkills && point.sourceType === '技能评估' && <button onClick={() => { const prior = data.skillAssessments.find(row => splitRefs(point.sourceRef).includes(row.id) && row.status === '已确认'); if (!prior) { setError('来源测评已撤销或删除，请先核对原评估。'); return; } const seed = { skillId: prior.skillId, previousAssessmentId: prior.id, weakPointId: point.id, checkinIds: data.checkins.filter(row => row.weakPointId === point.id).map(row => row.id) }; if (onRetest) onRetest(seed); else { setRetestSeed(seed); setSection('skills'); } }}>关联本阶段打卡，记录复测</button>}
        {!readOnly && <div className="actions">
          <button onClick={() => { setCheckinField('weakPointId', point.id); setCheckinField('date', today()); }}>选它为本次打卡</button>
          <button onClick={() => { if (!busy) pointEditor(point); }}>编辑</button>
          {point.status === '练习中' ? <button onClick={() => quickStatus(point, '暂停')}>暂停</button> : <button onClick={() => quickStatus(point, '练习中')}>恢复练习</button>}
          {point.status !== '已改善' && <button onClick={() => quickStatus(point, '已改善')}>标记已改善</button>}
          <button className="apple-btn apple-btn-danger" onClick={() => removePoint(point)}>删除</button>
        </div>}
      </article>)}</div></section>
      <section className="glass-card"><div className="section-head"><h2>最近 28 天打卡</h2><p className="muted">{checkinDates ? `${checkinDates} 天有打卡记录` : '最近 28 天没有打卡记录'}；颜色深浅表示当天记录的次数。</p></div>
        {!overview.total ? <Empty>尚无打卡记录。完成一次练习后再来记录，未打卡不代表没有练习。</Empty> : <div className="heat-strip">{overview.heatmap.map(day => <span key={day.date} className={`heat-day${day.times >= 6 ? ' level-3' : day.times >= 3 ? ' level-2' : day.times ? ' level-1' : ''}`} title={`${day.date} · ${day.times}次`} aria-label={`${day.date} ${day.times}次`}/>)}</div>}
        {!!overview.recent.length && <ul className="data-list">{overview.recent.map(record => <li key={record.id}><span>{record.date} · {record.pointTitle} · {record.times ?? '未填'}次 · {record.durationMinutes ? `${record.durationMinutes}分钟` : '时长未填'} · {record.quality || '完成质量未填'}</span>{!readOnly && <button className="apple-btn apple-btn-secondary" onClick={() => removeCheckin(record)}>删除</button>}</li>)}</ul>}
      </section>
    </>}
    {!embedded && <section className="glass-card"><div className="section-head"><h2>薄弱点候选（需家长确认后才写入）</h2><p className="muted">候选来自已录入的教练反馈、已审核录像观察和同项目成绩对比；平台不会自动写入。</p></div>
      {!overview.candidates.length ? <Empty>当前没有新的候选。录入教练反馈或同项目成绩后会自动提示。</Empty> : <div className="rule-list">{overview.candidates.map(candidate => <article className="rule-item" key={candidate.id}>
        <div className="flex-between"><h3>{candidate.title}</h3><span className="badge">{candidate.sourceType}{candidate.date ? ` · ${candidate.date}` : ''}</span></div>
        <p>{candidate.evidence}</p><RecordSources data={data} ids={candidate.sourceIds}/>
        {!readOnly && <div className="actions"><button className="apple-btn apple-btn-primary" onClick={() => pointFormState.replace({ date: today(), title: candidate.title, category: candidate.category, sourceType: candidate.sourceType, sourceRef: candidate.sourceRef, evidence: candidate.evidence, targetPerWeek: '', drillHint: '', status: '练习中', recordedBy: '', notes: '' })}>核对并录入薄弱点</button><span className="muted">确认后可修改名称、类别与每周目标次数。</span></div>}
      </article>)}</div>}
    </section>}
    {!readOnly && <GrowthForm form={pointFormState} title={editingPoint ? '编辑技术短板' : '新增技术短板'}><div><div className="section-head"><h2>{editingPoint ? '编辑薄弱点' : '新增薄弱点'}</h2><p className="muted">名称与依据照录教练原话或观察，不改写、不推测。</p></div>
      <div className="form-grid">
        <label>录入日期<input className="apple-input" type="date" value={pointForm.date} onChange={e => setPointField('date', e.target.value)}/></label>
        <label>薄弱点名称<input className="apple-input" value={pointForm.title} onChange={e => setPointField('title', e.target.value)} placeholder="如：转身后蹬壁不充分"/></label>
        <label>类别<select className="apple-input" value={pointForm.category} onChange={e => setPointField('category', e.target.value)}>{FIELDS.weakpoints.find(field => field.key === 'category').options.map(option => <option key={option}>{option}</option>)}</select></label>
        <label>来源<select className="apple-input" value={pointForm.sourceType} onChange={e => setPointField('sourceType', e.target.value)}>{FIELDS.weakpoints.find(field => field.key === 'sourceType').options.map(option => <option key={option}>{option}</option>)}</select></label>
        <label>状态<select className="apple-input" value={pointForm.status} onChange={e => setPointField('status', e.target.value)}>{FIELDS.weakpoints.find(field => field.key === 'status').options.map(option => <option key={option}>{option}</option>)}</select></label>
        <label>每周练习目标次数（可不填）<input className="apple-input" type="number" min="1" max="21" step="1" value={pointForm.targetPerWeek} onChange={e => setPointField('targetPerWeek', e.target.value)}/></label>
        <label className="search">来源实际记录（可选）<select className="apple-input" value={pointForm.sourceRef} onChange={e => setPointField('sourceRef', e.target.value)}><option value="">无关联记录，仅照录观察</option>{['skillAssessments','trainings','swim','annotations'].flatMap(key => (data[key] || []).map(row => <option key={row.id} value={row.id}>{row.date} · {row.standardSnapshot?.name || row.trainingType || row.title || row.observation || `${row.distance || ''}${row.stroke || ''}`} {row.level || ''}</option>))}{pointForm.sourceRef && !['skillAssessments','trainings','swim','annotations'].some(key => (data[key] || []).some(row => row.id === pointForm.sourceRef)) && <option value={pointForm.sourceRef}>保留的原关联（见来源详情）</option>}</select></label>
      </div>
      <label className="form-group">依据原文 / 观察<textarea className="apple-input" rows={3} value={pointForm.evidence} onChange={e => setPointField('evidence', e.target.value)}/></label>
      <label className="form-group">练习方式提示（照录教练建议或家长安排，可留空）<textarea className="apple-input" rows={2} value={pointForm.drillHint} onChange={e => setPointField('drillHint', e.target.value)}/></label>

    </div></GrowthForm>}
    {!embedded && <section className="glass-card"><div className="section-head"><h2>能力成长（只依据已录入成绩与测量）</h2><p className="muted">{growth.range.start ? `成绩范围 ${growth.range.start}—${growth.range.end}` : '尚无成绩记录'}；同一距离 / 泳姿 / 池长才互相比较，不与打卡次数做因果归因。</p></div>
      {!growth.projects.length ? <Empty>尚无成绩记录，不能描述能力变化；未录入不代表没有进步。<button type="button" className="apple-btn apple-btn-secondary" onClick={() => navigate('records', 'swim')}>录入成绩</button></Empty> : <div className="draft-grid">{growth.projects.map(project => <article className="metric-card" key={project.key}>
        <h3>{project.key}</h3>
        <p>已录入 {project.count} 条：{project.first.date} {project.first.time} → 最好 {project.best.date} {project.best.time}</p>
        <p>{project.improved === null ? '有效样本不足两条，暂不计算改善' : project.improved > 0 ? `首条到最好快 ${project.improved.toFixed(3)} 秒` : project.improved === 0 ? '首条即已录入最好成绩' : `首条到最好慢 ${Math.abs(project.improved).toFixed(3)} 秒`}；最近一次 {project.last.date} {project.last.time}{project.sinceLast > 0 ? `，比最好慢 ${project.sinceLast.toFixed(3)} 秒` : '，即该项目已录入最好成绩'}。</p>
      </article>)}</div>}
      {growth.height || growth.weight ? <p className="muted">身体测量（仅记录，不推断天赋）：{[growth.height ? `身高 ${growth.height.start}→${growth.height.end}cm（${growth.height.from}—${growth.height.to}，${growth.height.delta > 0 ? '+' : ''}${growth.height.delta}cm）` : '', growth.weight ? `体重 ${growth.weight.start}→${growth.weight.end}kg（${growth.weight.from}—${growth.weight.to}，${growth.weight.delta > 0 ? '+' : ''}${growth.weight.delta}kg）` : ''].filter(Boolean).join('；')}</p> : <p className="muted">身体测量不足两次，不计算变化。</p>}
    </section>}
    {!embedded && <section className="glass-card"><h2>本周练习建议（来自提升计划草稿）</h2><p className="muted">当前草稿重点由家长依据教练反馈确认；以下为已录入薄弱点在本周的打卡情况，不含虚构练习处方。</p><p>{dimensions.practice.active.length ? `练习中：${dimensions.practice.active.map(point => `${point.title}（本周${point.weekTimes}次${point.targetPerWeek ? ` / 目标${point.targetPerWeek}次` : ''}）`).join('；')}` : '暂无练习中的薄弱点。'}</p><p className="muted">引擎 {PRACTICE_ENGINE_VERSION} · 打卡依据 {overview.total} 条已录入记录；连续 {overview.streak.days} 天。</p><div className="actions"><button onClick={() => navigate('week')}>查看完整提升计划 →</button></div></section>}
  </div>;
}
function Stat({ label, value, hint }) { return <article className="glass-card stat"><p className="stat-label">{label}</p><strong className="stat-value">{value}</strong><small className="stat-hint">{hint}</small></article>; }
