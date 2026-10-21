import { performanceMilliseconds, performanceLabel } from '../../shared/performance.ts';
import { trainingFacts, trainingSummary } from '../../shared/training.ts';
import { useMemo, useState } from 'react';
import { analysis, best, eventRecords, latest, planContext } from '../../shared/domain.mjs';
import { today } from '../services/files';
import { practiceOverview } from '../../shared/practice.mjs';
import { Empty, Message } from './ui';
import RecordSources, { RecordSourceModal } from './RecordSources';
const projectKey = record => [record.distance || '未知', record.stroke || '未知', record.poolLength || '未知'].join(' · ');
export default function Dashboard({ data, navigate, readOnly = false }) {
  const result = useMemo(() => analysis(data), [data]);
  const pb25 = useMemo(() => best(data.swim, '25m', '自由泳', '25m'), [data.swim]);
  const growth = useMemo(() => latest(data.growth), [data.growth]);
  const context = useMemo(() => planContext(data, today(), result.version), [data, result.version]);
  const practice = useMemo(() => practiceOverview(data), [data]);
  const weekTraining = trainingSummary(data.trainings.filter(r => r.date >= practice.week.start && r.date <= today()));
  const latestTraining = [...data.trainings].filter(r => r.date <= today() && trainingFacts(r).occurred).sort((a, b) => b.date.localeCompare(a.date))[0];
  const activePlan = context.current;
  const [sourceId, setSourceId] = useState(null);
  const [project, setProject] = useState('');
  const projects = useMemo(() => {
    const counts = new Map();
    for (const record of data.swim) {
      if (performanceMilliseconds(record) == null) continue;
      counts.set(projectKey(record), (counts.get(projectKey(record)) || 0) + 1);
    }
    return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }, [data.swim]);
  const selectedKey = projects.some(p => p.key === project) ? project : projects.find(p => p.key === '50m · 自由泳 · 50m')?.key || projects[0]?.key || '';
  const [distance, stroke, poolLength] = selectedKey ? selectedKey.split(' · ') : [];
  const values = useMemo(() => selectedKey ? eventRecords(data.swim, distance, stroke, poolLength) : [], [data.swim, selectedKey, distance, stroke, poolLength]);
  const chart = useMemo(() => {
    const points = values.map(r => performanceMilliseconds(r));
    if (!points.length) return null;
    const min = Math.min(...points), max = Math.max(...points);
    return { min, max, spread: Math.max(max - min, 1000) };
  }, [values]);
  return <div className="stack fade-in"><header className="page-header"><div><p className="eyebrow">依据你录入的记录</p><h1>{data.profile.name || 'Nico'}的游泳成长</h1><p className="muted">最近成绩记录：{result.recent?.date || '尚未录入'}</p></div><button className="apple-btn apple-btn-primary" onClick={() => navigate('records', 'trainings')}>{readOnly ? '查看训练记录' : '记录本次训练'}</button></header>
    <section className="focus-card"><span className="eyebrow">{activePlan ? '已确认的周期重点' : '当前待确认的重点'}</span><h2>{activePlan?.focus || result.focus}</h2><p>{activePlan ? `计划${activePlan.title} · 版本${activePlan.version} · 确认人${activePlan.reviewedBy} · ${activePlan.startDate}—${activePlan.endDate}` : '依据成绩、训练反馈和已审核录像生成复核建议；具体课表、练习量和技术判断由家长依据教练反馈确认。'}</p><Message>{context.message}</Message>{!activePlan && result.focusEvidence && <><p>{result.focusEvidence.kind}（{result.focusEvidence.date}）：{result.focusEvidence.text}</p><RecordSources data={data} ids={result.focusEvidence.sourceIds}/></>}<button onClick={() => navigate('week')}>查看本周与提升计划 →</button></section>
    <section className="fact-grid"><Fact label="50米自由泳 · 50米池PB" value={result.pb ? performanceLabel(result.pb) : '未记录'} detail={result.pb?.date}/><Fact label="25米自由泳 · 25米池PB" value={pb25 ? performanceLabel(pb25) : '未记录'} detail={pb25?.date}/><Fact label="最近身体测量" value={growth?.date || '未记录'} detail="只展示测量，不推断竞技天赋"/></section>
    <section className="glass-card"><h2>最近训练与本周记录</h2>{!latestTraining ? <Empty>尚无填写了实际完成依据的训练。可从快速记录开始。</Empty> : <p>最近训练：{latestTraining.date} · {latestTraining.session || latestTraining.trainingType || '水上训练'} · {latestTraining.completionStatus || '完成情况未记录'}</p>}<div className="stat-grid"><Stat label="本周实际训练" value={weekTraining.count ? `${weekTraining.count}次` : '暂无记录'} hint={`共${weekTraining.records}条；实际时长或距离大于零、或人工标记完成/部分完成才计次`}/><Stat label="本周已知时长" value={weekTraining.minutes == null ? '未记录' : `${weekTraining.minutes}分钟`} hint={`${weekTraining.minutesCount}条填写时长，缺失部分不补齐`}/><Stat label="本周已知实际距离" value={weekTraining.metersCount || weekTraining.knownMeters ? `${weekTraining.knownMeters}米` : '未记录'} hint={weekTraining.unknownSets ? `${weekTraining.unknownSets}组实际次数未填；已知部分另行汇总` : '按实际次数汇总；计划与模板不计入'}/></div></section>
    <section className="glass-card"><div className="section-head"><h2>数据覆盖</h2><p className="muted">点击进入对应类型的实际记录</p></div><div className="coverage-grid">{[['trainings', '水上训练'], ['fitness', '体能测量'], ['nutrition', '恢复与饮食']].map(([key, label]) => <button key={key} onClick={() => navigate('records', key)}><strong>{data[key].length}条</strong><span>{label}</span><small>{data[key].length ? '查看实际记录' : '未记录 · 未评估'}</small></button>)}</div></section>
    <section className="glass-card"><div className="section-head"><h2>薄弱点打卡</h2><button onClick={() => navigate('practice')}>去打卡 →</button></div>{!practice.points.length ? <Empty>尚未录入薄弱点；可依据教练反馈在打卡页确认后开始练习。</Empty> : <div className="stat-grid"><Stat label="本周打卡次数" value={practice.weekTimes} hint={practice.weekTarget ? `周目标 ${practice.weekTarget} 次` : `未设定周目标 · ${practice.week.start}—${practice.week.end}`}/><Stat label="连续打卡" value={practice.streak.days ? `${practice.streak.days}天` : '0天'} hint={practice.streak.days ? `${practice.streak.start}—${practice.streak.end}` : '今天或昨天有打卡才开始计算'}/><Stat label="练习中薄弱点" value={practice.active.length} hint={`共录入 ${practice.points.length} 个`}/></div>}</section>
    <section className="glass-card"><div className="section-head"><h2>成绩趋势</h2>{projects.length > 0 && <label>项目<select className="apple-input" value={selectedKey} onChange={e => setProject(e.target.value)} aria-label="选择成绩项目">{projects.map(p => <option key={p.key} value={p.key}>{p.key}（{p.count}条）</option>)}</select></label>}</div>
      <p className="muted">按"距离 · 泳姿 · 池长"分别统计，未混在一起比较；出发与计时条件未知时只呈现记录变化；仅核验有效成绩参与趋势。</p>
      {!values.length ? projects.length ? <Empty>该项目尚无已核验有效成绩；历史记录仍在成绩中心。</Empty> : <Empty>尚无填写了可解析成绩的成绩记录。<button type="button" className="apple-btn apple-btn-secondary" onClick={() => navigate('records', 'swim')}>录入成绩</button></Empty> : <>{values.length >= 2 ? <svg className="trend" viewBox="0 0 600 160" role="img" aria-label={`已录入的${selectedKey}成绩变化，具体值见下方列表`}><polyline fill="none" stroke="currentColor" strokeWidth="3" points={values.map((r, i) => `${40 + (i * 520 / Math.max(1, values.length - 1))},${20 + (chart.spread ? (performanceMilliseconds(r) - chart.min) / chart.spread * 95 : 0)}`).join(' ')}/>{values.map((r, i) => { const x = 40 + i * 520 / Math.max(1, values.length - 1), y = 20 + (chart.spread ? (performanceMilliseconds(r) - chart.min) / chart.spread * 95 : 0); return <g key={r.id}><circle cx={x} cy={y} r="5" fill="currentColor" onClick={() => setSourceId(r.id)} style={{ cursor: 'pointer' }}/><text x={x} y={y + 23} textAnchor="middle">{performanceLabel(r)}</text></g>; })}</svg> : <Message>仅1条有效成绩，数据不足，暂不绘制趋势线。</Message>}<ul className="data-list">{values.map(r => <li key={r.id}><button onClick={() => setSourceId(r.id)}>{r.date} · {r.time} · {r.recordType || '性质未知'} · {r.timingMethod || '计时未知'}</button></li>)}</ul><p className="muted">点击圆点或列表项可查看该条成绩的原始来源。</p></> }</section>
    <section className="glass-card"><h2>当前分析 · {result.version}</h2><p className="muted">事实、原始记录与待验证建议分别标注；没有自动天赋评分或成绩预测。</p><ul className="fact-list">{result.facts.map((fact, i) => <li key={i}><span className="badge">{fact.kind}</span><p>{fact.text}</p><RecordSources data={data} ids={fact.sourceIds}/></li>)}</ul><div className="actions"><button onClick={() => navigate('review')}>生成本周报告 →</button><button onClick={() => navigate('profile')}>查看个人目标 →</button></div></section>
    <RecordSourceModal data={data} sourceId={sourceId} onClose={() => setSourceId(null)}/>
  </div>;
}
function Stat({ label, value, hint }) { return <article className="glass-card stat"><p className="stat-label">{label}</p><strong className="stat-value">{value}</strong><small className="stat-hint">{hint}</small></article>; }
function Fact({ label, value, detail }) { return <article className="glass-card fact"><p>{label}</p><strong>{value}</strong><small>{detail || '无实测时留空'}</small></article>; }
