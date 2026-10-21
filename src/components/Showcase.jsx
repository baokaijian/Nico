import { performanceGroups, performanceMilliseconds, performanceLabel, performanceInput, improvementRateLabel, eligiblePerformance, validityLabel } from '../../shared/performance.ts';
import { useMemo, useState } from 'react';
import { Modal } from './ui';

// Public showcase. It only reads the fields the parent confirmed for publication
// (date / distance / stroke / poolLength / time / seconds, media url+poster).
// Nothing here is estimated: personal bests and gaps are computed from the
// published records themselves, and empty states stay empty.
const NO_RECORDS = [];
const strokeLabel = record => `${record.distance} ${record.stroke} · ${record.poolLength}池`;
const eventKey = record => `${record.distance}|${record.stroke}|${record.poolLength}`;
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

export default function Showcase({ data, published, story = '', view = 'home', api, onNavigate }) {
  const swim = data.swim || NO_RECORDS, media = data.media || NO_RECORDS;
  const [active, setActive] = useState(null), [event, setEvent] = useState('');
  const orderedMedia = useMemo(() => [...media].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)), [media]);
  const events = useMemo(() => performanceGroups(swim).map(group => ({ ...group, label: strokeLabel(group.records[0]) }))
    .sort((a, b) => b.records.length - a.records.length || a.label.localeCompare(b.label)), [swim]);
  const timeline = useMemo(() => {
    const bestOf = new Map(events.filter(group => group.best).map(group => [group.key, performanceMilliseconds(group.best)]));
    return [...swim].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
      .filter(record => !event || eventKey(record) === event)
      .map(record => ({ ...record, gapMs: eligiblePerformance(record) && bestOf.has(eventKey(record)) ? performanceMilliseconds(record) - bestOf.get(eventKey(record)) : null }));
  }, [swim, events, event]);
  const selected = media.find(item => item.id === active) || null;
  const nothing = !swim.length && !media.length;
  if (nothing) return <div className="stack"><EmptyPublic>当前摘要中没有成绩或影像。内容为原始录入值，不填充示例数据。</EmptyPublic></div>;
  if (view === 'media') return <div className="stack fade-in">
    <header><h1>精选影像</h1><p className="muted">共{media.length}项影像，按日期排列。</p></header>
    {!media.length ? <EmptyPublic>摘要中尚无影像。</EmptyPublic> : <div className="media-showcase-grid">{orderedMedia.map(item => <MediaCard key={item.id} item={item} api={api} onPlay={() => setActive(item.id)}/>)}</div>}
    <MediaViewer item={selected} api={api} onClose={() => setActive(null)}/>
  </div>;
  if (view === 'results') return <div className="stack fade-in">
    <div className="section-head"><div><h1>成绩记录</h1><p className="muted">共{swim.length}条成绩，按项目分别统计。</p></div></div>
    {!swim.length ? <EmptyPublic>摘要中尚无成绩。</EmptyPublic> : <>
      <div className="chip-row" role="group" aria-label="按项目筛选">
        <button className="chip" aria-pressed={!event} onClick={() => setEvent('')}>全部项目</button>
        {events.map(group => <button key={group.key} className="chip" aria-pressed={event === group.key} onClick={() => setEvent(group.key)}>{group.label}（{group.records.length}）</button>)}
      </div>
      <div className="timeline">{timeline.map(record => <article className="timeline-item" key={record.id}>
        <span className="timeline-date">{dayLabel(record.date)}</span>
        <span className="timeline-event">{strokeLabel(record)}</span>
        <span className="timeline-value">{performanceLabel(record)}<small className="timeline-delta">{validityLabel(record)} · {record.timingMethod || '计时未知'}</small>{record.gapMs === 0 ? <small className="timeline-delta"><span className="badge">该项目个人最佳</span></small> : record.gapMs !== null ? <small className="timeline-delta">较该项目最好成绩慢{(record.gapMs / 1000).toFixed(3)}秒</small> : null}</span>
      </article>)}</div>
      <p className="showcase-note">个人最佳、差距和趋势仅使用已核验有效成绩；按距离、泳姿、池长分别统计。未核验、失格或无效记录仍显示于历史。</p>
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
    {events.length > 0 && <section>
      <div className="section-head"><h2>各项目最好成绩</h2><p className="muted">同一项目内比较，不跨项目换算。</p></div>
      <div className="pb-grid">{events.map(group => <article className="pb-card" key={group.key}>
        <span className="pb-title">{group.label}</span>
        <span className="pb-time">{group.best ? performanceLabel(group.best) : '待核验'}</span>
        <span className="pb-meta">{group.best ? dayLabel(group.best.date) : '尚无已核验有效成绩'} · {group.valid.length}条有效 / 共{group.records.length}条</span>
        <Sparkline points={group.valid} label={`${group.label}有效成绩变化；计时条件见成绩列表`}/>
        {group.improvementRate !== null && <span className="pb-meta">首条有效成绩到PB改善{improvementRateLabel(group.improvementRate)}（{group.improvementMs}毫秒）</span>}
      </article>)}</div>
    </section>}
    {media.length > 0 && <section>
      <div className="section-head"><h2>精选影像</h2><p className="muted">{media.length > 3 ? `最近3项 / 共${media.length}项` : `共${media.length}项`} · 点击封面即可查看</p></div>
      <div className="media-showcase-grid">{orderedMedia.slice(0, 3).map(item => <MediaCard key={item.id} item={item} api={api} heading="h3" onPlay={() => setActive(item.id)}/>)}</div>
    </section>}
    {swim.length > 0 && <div className="actions">{onNavigate && <button className="apple-btn apple-btn-primary" onClick={() => onNavigate('results')}>查看全部成绩记录 →</button>}</div>}
    <p className="showcase-note">成绩为原始录入值，未经换算或预测。</p>
    <MediaViewer item={selected} api={api} onClose={() => setActive(null)}/>
  </div>;
}
