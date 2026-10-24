import { performanceMilliseconds, performanceLabel, performanceInput, improvementRateLabel, validityLabel } from '../../shared/performance.ts';
import {publicResults,publicEventLabel} from '../../shared/public-results.mjs';
import { useMemo, useState } from 'react';
import { Modal } from './ui';

// Public showcase. It only reads the fields the parent confirmed for publication
// (date / distance / stroke / poolLength / time / seconds, media url+poster).
// Nothing here is estimated: personal bests and gaps are computed from the
// published records themselves, and empty states stay empty.
const NO_RECORDS = [];
const strokeLabel = publicEventLabel;
const dayLabel = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? `${value.slice(0, 4)}年${Number(value.slice(5, 7))}月${Number(value.slice(8, 10))}日` : (value || '日期未记录');
const assetUrl = (api, relative) => api?.publicMediaUrl ? api.publicMediaUrl(relative) : `${import.meta.env.BASE_URL}${String(relative).replace(/^\//, '')}`;

function Sparkline({ points, label }) {
  if (points.length < 2) return <p className="pb-meta">{points.length ? '该项目仅1条有效记录，暂无趋势线。' : '尚无已核验有效成绩，暂不绘制趋势。'}</p>;
  const seconds = points.map(p => performanceMilliseconds(p));
  const min = Math.min(...seconds), max = Math.max(...seconds), spread = Math.max(max - min, 1000);
  const step = 100 / (points.length - 1);
  return <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={label}>
    <polyline fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" points={points.map((p, i) => `${i * step},${4 + (performanceMilliseconds(p) - min) / spread * 20}`).join(' ')}/>
    {points.map((p, i) => <circle key={p.id} cx={i * step} cy={4 + (performanceMilliseconds(p) - min) / spread * 20} r="1.6" fill="currentColor"><title>{p.date} · 精确计时{performanceInput(p)}</title></circle>)}
  </svg>;
}

function MediaCard({ item, api, onPlay, heading = 'h2' }) {
  const poster = item.posterUrl ? assetUrl(api, item.posterUrl) : '';
  const Title = heading;
  return <article className="showcase-media-card">
    <button className="poster-button" onClick={onPlay} aria-label={`${item.type === 'video' ? '播放' : '查看'}${item.title}，${dayLabel(item.date)}`}>
      {poster ? <img src={poster} alt={`${item.title}封面`} loading="lazy"/> : <span>影像</span>}
      <span className="media-kind">{item.type === 'video' ? '视频' : '图片'}</span>
      <span className="play-label" aria-hidden="true">{item.type === 'video' && <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>}{item.type === 'video' ? '播放' : '查看'}</span>
    </button>
    <div className="showcase-media-caption"><Title>{item.title}</Title><p><time dateTime={item.date}>{dayLabel(item.date)}</time>{item.duration > 0 && <span>{item.duration.toFixed(1)}秒</span>}</p></div>
  </article>;
}

function MediaViewer({ item, api, onClose }) {
  if (!item) return null;
  return <Modal title={`${dayLabel(item.date)} · ${item.title}`} onClose={onClose}>
    {item.type === 'video'
      ? <video className="media-player" controls autoPlay playsInline preload="metadata" src={assetUrl(api, item.url)}/>
      : <img className="media-player" src={assetUrl(api, item.url)} alt={item.title}/>}
    {item.duration > 0 && <p className="muted">时长{item.duration.toFixed(1)}秒。</p>}
  </Modal>;
}

function EmptyPublic({ children }) { return <div className="glass-card"><p className="empty">{children}</p></div>; }

function BestCards({groups}) { return <div className="pb-grid">{groups.map(group=><article className="pb-card" key={group.key}><span className="pb-title">{group.label}</span><span className="pb-time">{performanceLabel(group.best)}</span><span className="pb-meta">{dayLabel(group.best.date)} · {group.valid.length}条有效 / 共{group.records.length}条</span><Sparkline points={group.valid} label={`${group.label}有效成绩变化；计时条件见成绩列表`}/>{group.improvementRate!==null&&<span className="pb-meta">首条有效成绩到PB改善{improvementRateLabel(group.improvementRate)}（{group.improvementMs}毫秒）</span>}</article>)}</div>; }
function ScoreRows({records}) { return records.length?<div className="timeline">{records.map(r=><article className="timeline-item" key={r.id}><time className="timeline-date" dateTime={r.date}>{dayLabel(r.date)}</time><span className="timeline-event">{strokeLabel(r)}</span><span className="timeline-value">{performanceLabel(r)}<small className="timeline-delta">{validityLabel(r)} · {r.timingMethod||'计时未知'}</small>{r.projectUnclear?<small className="timeline-delta">具体打腿项目未公开，不作可比PB</small>:r.gapMs===0?<small className="timeline-delta"><span className="badge">该项目个人最佳</span></small>:r.gapMs!==null?<small className="timeline-delta">较该项目最好成绩慢{(r.gapMs/1000).toFixed(3)}秒</small>:null}</span></article>)}</div>:<p className="empty">当前筛选下没有记录。</p>; }

export default function Showcase({ data, published, story = '', view = 'home', api, onNavigate }) {
  const swim = data.swim || NO_RECORDS, media = data.media || NO_RECORDS;
  const [active, setActive] = useState(null), [event, setEvent] = useState('');
  const orderedMedia = useMemo(() => [...media].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)), [media]);
  const result=useMemo(()=>publicResults(swim),[swim]),events=result.events,selectedEvent=events.some(e=>e.key===event)?event:'',pbGroups=result.pbGroups.filter(g=>!selectedEvent||g.key===selectedEvent),timeline=result.history.filter(r=>!selectedEvent||r.eventKey===selectedEvent),verified=result.verified.filter(r=>!selectedEvent||r.eventKey===selectedEvent);
  const selected = media.find(item => item.id === active) || null;
  const nothing = !swim.length && !media.length;
  if (nothing) return <div className="stack"><EmptyPublic>当前摘要中没有成绩或影像。内容为原始录入值，不填充示例数据。</EmptyPublic></div>;
  if (view === 'media') return <div className="stack fade-in">
    <header><h1>精选影像</h1><p className="muted">共{media.length}项影像，按日期排列。</p></header>
    {!media.length ? <EmptyPublic>摘要中尚无影像。</EmptyPublic> : <div className="media-showcase-grid">{orderedMedia.map(item => <MediaCard key={item.id} item={item} api={api} onPlay={() => setActive(item.id)}/>)}</div>}
    <MediaViewer item={selected} api={api} onClose={() => setActive(null)}/>
  </div>;
  if (view === 'results') return <div className="stack fade-in">
    <header><h1>成绩记录</h1><p className="muted">共{swim.length}条经家长授权的原始计时；核验状态与历史记录分别展示。</p></header>
    {!swim.length?<EmptyPublic>摘要中尚无成绩。</EmptyPublic>:<>
      <div className="chip-row" role="group" aria-label="按项目筛选"><button className="chip" aria-pressed={!selectedEvent} onClick={()=>setEvent('')}>全部项目</button>{events.map(g=><button key={g.key} className="chip" aria-pressed={selectedEvent===g.key} onClick={()=>setEvent(g.key)}>{g.label}（{g.records.length}）</button>)}</div>
      <section className="verified-results"><div className="section-head"><div><h2>已核验成绩和个人最佳</h2><p className="muted">只统计有效、同项目、同池长的成绩。</p></div><span className="badge">{verified.length}条有效记录</span></div>{pbGroups.length?<BestCards groups={pbGroups}/>:<EmptyPublic>当前项目暂无可用于个人最佳展示的已核验成绩。原始计时仍保留在下方历史中。</EmptyPublic>}{!!verified.length&&<details><summary>已核验成绩明细（{verified.length}条）</summary><ScoreRows records={verified}/></details>}</section>
      <section className="historical-results"><div className="section-head"><div><h2>历史原始计时记录</h2><p className="muted">保留全部已授权历史，包含已核验、未核验、失格及无效状态。</p></div><span>{timeline.length}条</span></div><ScoreRows records={timeline}/></section>
      <p className="showcase-note">个人最佳、差距和趋势仅使用已核验有效成绩；按距离、泳姿、池长分别统计。具体打腿项目未公开时，不作可比较的个人最佳。不换算或预测，不改变原始有效性状态。</p>
    </>}
  </div>;
  return <div className="stack fade-in">
    <section className="hero">
      <span className="eyebrow">游泳成长摘要</span>
      <h1>Nico 的游泳成长</h1>
      <p>{story || '成绩与影像摘要。'}</p>
      <div className="hero-meta">
        <span className="badge">发布日期：{published || '未确认'}</span>
        <span className="badge">成绩 {swim.length}条</span>
        <span className="badge">影像 {media.length}项</span>
      </div>
    </section>
    <section className="stat-grid">
      <article className="stat"><span className="stat-value">{swim.length}</span><span className="stat-label">成绩记录</span><span className="stat-hint">按项目分别统计</span></article>
      <article className="stat"><span className="stat-value">{events.length}</span><span className="stat-label">覆盖项目</span><span className="stat-hint">距离 · 泳姿 · 池长</span></article>
      <article className="stat"><span className="stat-value">{media.length}</span><span className="stat-label">精选影像</span><span className="stat-hint">视频与图片</span></article>
    </section>
    {result.pbGroups.length>0&&<section><div className="section-head"><h2>已核验个人最佳</h2><p className="muted">同一项目内比较，不跨项目换算。</p></div><BestCards groups={result.pbGroups}/></section>}
    {!!swim.length&&!result.pbGroups.length&&<p className="showcase-note">当前还没有可展示的已核验个人最佳；已授权的历史原始计时仍可查看。</p>}
    {media.length > 0 && <section>
      <div className="section-head"><h2>精选影像</h2><p className="muted">{media.length > 3 ? `最近3项 / 共${media.length}项` : `共${media.length}项`} · 点击封面即可查看</p></div>
      <div className="media-showcase-grid">{orderedMedia.slice(0, 3).map(item => <MediaCard key={item.id} item={item} api={api} heading="h3" onPlay={() => setActive(item.id)}/>)}</div>
    </section>}
    {swim.length > 0 && <div className="actions">{onNavigate && <button className="apple-btn apple-btn-primary" onClick={() => onNavigate('results')}>查看全部成绩记录 →</button>}</div>}
    <p className="showcase-note">成绩为原始录入值，未经换算或预测。</p>
    <MediaViewer item={selected} api={api} onClose={() => setActive(null)}/>
  </div>;
}
