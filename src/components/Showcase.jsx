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
  if (points.length < 2) return <p className="pb-meta">{points.length ? '该项目仅1条记录，暂无趋势线。' : ''}</p>;
  const seconds = points.map(p => p.seconds);
  const min = Math.min(...seconds), max = Math.max(...seconds), spread = max - min || 1;
  const step = 100 / (points.length - 1);
  return <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" role="img" aria-label={label}>
    <polyline fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" points={points.map((p, i) => `${i * step},${4 + (p.seconds - min) / spread * 20}`).join(' ')}/>
    {points.map((p, i) => <circle key={p.id} cx={i * step} cy={4 + (p.seconds - min) / spread * 20} r="1.6" fill="currentColor"/>)}
  </svg>;
}

function MediaCard({ item, api, onPlay }) {
  const poster = item.posterUrl ? assetUrl(api, item.posterUrl) : '';
  return <article className="glass-card media-item">
    <button className="poster-button" onClick={onPlay} aria-label={`播放${item.title}`}>
      {poster ? <img src={poster} alt={`${item.title}封面`} loading="lazy"/> : <span>影像</span>}
      <span className="play-label">{item.type === 'video' ? '播放' : '查看'}</span>
    </button>
    <h2>{item.title}</h2>
    <p className="muted">{dayLabel(item.date)}{item.duration ? ` · ${item.duration.toFixed(1)}秒` : ''} · {item.type === 'video' ? '视频' : '图片'}</p>
  </article>;
}

function EmptyPublic({ children }) { return <div className="glass-card"><p className="empty">{children}</p></div>; }

export default function Showcase({ data, published, story = '', view = 'home', api, onNavigate }) {
  const swim = data.swim || NO_RECORDS, media = data.media || NO_RECORDS;
  const [active, setActive] = useState(null), [event, setEvent] = useState('');
  const events = useMemo(() => {
    const groups = new Map();
    for (const record of [...swim].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
      const key = eventKey(record);
      const group = groups.get(key) || { key, label: strokeLabel(record), records: [] };
      group.records.push(record);
      groups.set(key, group);
    }
    return [...groups.values()].map(group => ({ ...group, best: group.records.reduce((pb, r) => !pb || r.seconds < pb.seconds ? r : pb, null) }))
      .sort((a, b) => b.records.length - a.records.length || a.label.localeCompare(b.label));
  }, [swim]);
  const timeline = useMemo(() => {
    const bestOf = new Map(events.map(group => [group.key, group.best.seconds]));
    return [...swim].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
      .filter(record => !event || eventKey(record) === event)
      .map(record => ({ ...record, gap: record.seconds - bestOf.get(eventKey(record)) }));
  }, [swim, events, event]);
  const selected = media.find(item => item.id === active) || null;
  const nothing = !swim.length && !media.length;
  if (nothing) return <div className="stack"><EmptyPublic>{published ? '家长已确认发布范围，但当前没有选择任何成绩或影像。' : '家长尚未选择公开内容。此页只显示家长确认公开的成绩与影像，不会展示任何未公开记录，也不会填充示例数据。'}</EmptyPublic></div>;
  if (view === 'media') return <div className="stack fade-in">
    <header><h1>精选影像</h1><p className="muted">仅展示家长已确认公开的图片与视频，共{media.length}项。</p></header>
    {!media.length ? <EmptyPublic>尚未选择公开的影像。</EmptyPublic> : <div className="media-showcase-grid">{media.map(item => <MediaCard key={item.id} item={item} api={api} onPlay={() => setActive(item.id)}/>)}</div>}
    {selected && <Modal title={`${dayLabel(selected.date)} · ${selected.title}`} onClose={() => setActive(null)}>
      {selected.type === 'video'
        ? <video className="media-player" controls playsInline preload="metadata" src={assetUrl(api, selected.url)}/>
        : <img className="media-player" src={assetUrl(api, selected.url)} alt={selected.title}/>}
      <p className="muted">{selected.duration ? `时长${selected.duration.toFixed(1)}秒。` : ''}原始素材按公开范围提供，未作剪辑。</p>
    </Modal>}
  </div>;
  if (view === 'results') return <div className="stack fade-in">
    <div className="section-head"><div><h1>成绩记录</h1><p className="muted">仅含家长已确认公开的成绩，共{swim.length}条，按项目分别统计。</p></div></div>
    {!swim.length ? <EmptyPublic>尚未选择公开的成绩。</EmptyPublic> : <>
      <div className="chip-row" role="group" aria-label="按项目筛选">
        <button className="chip" aria-pressed={!event} onClick={() => setEvent('')}>全部项目</button>
        {events.map(group => <button key={group.key} className="chip" aria-pressed={event === group.key} onClick={() => setEvent(group.key)}>{group.label}（{group.records.length}）</button>)}
      </div>
      <div className="timeline">{timeline.map(record => <article className="timeline-item" key={record.id}>
        <span className="timeline-date">{dayLabel(record.date)}</span>
        <span className="timeline-event">{strokeLabel(record)}<small>家长已确认公开</small></span>
        <span className="timeline-value">{record.time}{record.gap === 0 ? <small className="timeline-delta"><span className="badge">该项目个人最佳</span></small> : <small className="timeline-delta">较该项目最好成绩慢{record.gap.toFixed(2)}秒</small>}</span>
      </article>)}</div>
      <p className="showcase-note">"个人最佳"与差距均由上方已公开成绩直接计算，不是预测；未公开的成绩不参与比较。</p>
    </>}
  </div>;
  return <div className="stack fade-in">
    <section className="hero">
      <span className="eyebrow">家长已确认的公开内容</span>
      <h1>Nico 的游泳成长</h1>
      <p>{story || '展示家长选择公开的成绩与影像。'}</p>
      <div className="hero-meta">
        <span className="badge">发布日期：{published || '未确认'}</span>
        <span className="badge">成绩 {swim.length}条</span>
        <span className="badge">影像 {media.length}项</span>
      </div>
    </section>
    <section className="stat-grid">
      <article className="stat"><span className="stat-value">{swim.length}</span><span className="stat-label">已公开成绩</span><span className="stat-hint">按项目分别统计</span></article>
      <article className="stat"><span className="stat-value">{events.length}</span><span className="stat-label">覆盖项目</span><span className="stat-hint">距离 · 泳姿 · 池长</span></article>
      <article className="stat"><span className="stat-value">{media.length}</span><span className="stat-label">精选影像</span><span className="stat-hint">视频与图片</span></article>
    </section>
    {events.length > 0 && <section>
      <div className="section-head"><h2>各项目最好成绩</h2><p className="muted">同一项目内比较，不跨项目换算。</p></div>
      <div className="pb-grid">{events.map(group => <article className="pb-card" key={group.key}>
        <span className="pb-title">{group.label}</span>
        <span className="pb-time">{group.best.time}</span>
        <span className="pb-meta">{dayLabel(group.best.date)} · 该项目{group.records.length}条记录</span>
        <Sparkline points={group.records} label={`${group.label}成绩变化：最快${group.best.time}`}/>
      </article>)}</div>
    </section>}
    {media.length > 0 && <section>
      <div className="section-head"><h2>最新影像</h2>{onNavigate && <button className="apple-btn apple-btn-secondary" onClick={() => onNavigate('media')}>查看全部影像 →</button>}</div>
      <div className="media-showcase-grid">{[...media].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map(item => <MediaCard key={item.id} item={item} api={api} onPlay={() => onNavigate ? onNavigate('media') : setActive(item.id)}/>)}</div>
    </section>}
    {swim.length > 0 && <div className="actions">{onNavigate && <button className="apple-btn apple-btn-primary" onClick={() => onNavigate('results')}>查看全部成绩记录 →</button>}</div>}
    <p className="showcase-note">本页只显示家长在档案页勾选并确认公开的成绩与影像；其余记录不会出现在公开页面。成绩为原始录入值，未经换算或预测。</p>
  </div>;
}
