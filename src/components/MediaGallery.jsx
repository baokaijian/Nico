import { today } from '../services/files';
import { useEffect, useState } from 'react';
import { FIELDS, ordered } from '../../shared/domain.mjs';
import { Field, Message, Empty, Modal } from './ui';
import Records from './Records';
function Asset({ item, api, publicMode, variant = 'poster', onPlay, clipEnd }) {
  const [url, setUrl] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let loaded;
    setError(''); setUrl('');
    if (publicMode) { const relative = variant === 'poster' ? item.posterUrl : item.url; if (relative) setUrl(`${import.meta.env.BASE_URL}${relative.replace(/^\//, '')}`); return () => controller.abort(); }
    if (variant === 'poster' && !item.posterUrl) return () => controller.abort();
    api.mediaBlob(item.id, variant, controller.signal).then(value => { loaded = value; if (!controller.signal.aborted) setUrl(value); else URL.revokeObjectURL(value); }).catch(problem => { if (problem.name !== 'AbortError') setError(problem.message); });
    return () => { controller.abort(); if (loaded) URL.revokeObjectURL(loaded); };
  }, [item.id, item.posterUrl, item.url, api, variant, publicMode]);
  if (error) return <div><Message error>{error}</Message>{variant === 'poster' && <button onClick={onPlay}>打开{item.displayTitle || item.title}</button>}</div>;
  if (variant === 'poster') return <button className="poster-button" onClick={onPlay} aria-label={`播放${item.displayTitle || item.title}`} >{url ? <img src={url} alt={`${item.displayTitle || item.title}封面`} onError={() => setError('封面加载失败，仍可尝试打开素材')}/> : <span>影像 · {item.duration ? `${item.duration.toFixed(1)}秒` : '时长待处理'}</span>}<span className="play-label">播放</span></button>;
  if (!url) return <Message>正在读取素材…</Message>;
  return item.type === 'video' ? <video className="media-player" controls playsInline preload="metadata" src={url} onTimeUpdate={e => { if (clipEnd != null && e.currentTarget.currentTime >= clipEnd) e.currentTarget.pause(); }} onError={() => setError('此格式或网络暂不可播放，请选择兼容播放副本或刷新处理状态')}/> : <img className="media-player" src={url} alt={item.title} onError={() => setError('图片加载失败')}/>;
}
export default function MediaGallery({ data, api, onSaved, reload, readOnly, publicMode = false, allowUpload = true }) {
  const [active, setActive] = useState(null), [quality, setQuality] = useState('playback'), [filter, setFilter] = useState(''), [form, setForm] = useState({ date: today(), title: '', description: '', category: '', recordId: '' }), [file, setFile] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [clipEnd, setClipEnd] = useState(null);
  const upload = async e => {
    e.preventDefault(); if (!file) { setError('请选择素材'); return; } if (file.size > 100 * 1024 * 1024) { setError('文件不能超过100MB'); return; }
    setError(''); setBusy(true); setProgress(0);
    const body = new FormData(); Object.entries(form).forEach(([key, value]) => body.append(key, value)); body.append('file', file);
    try { const saved = await api.upload(body, setProgress); onSaved('media', saved); setForm({ date: today(), title: '', description: '', category: '', recordId: '' }); setFile(null); e.target.reset(); } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  };
  const remove = async id => { if (!window.confirm('将素材记录移入回收站？原片仍会保留。')) return; try { await api.request(`/api/media/${id}`, { method: 'DELETE' }); onSaved('media', null, id); setActive(null); } catch (problem) { setError(problem.message); } };
  const items = ordered(data.media).reverse().filter(m => !filter || [m.title, m.date, m.category].join(' ').includes(filter)).map(m => ({ ...m, displayTitle: data.media.filter(other => other.title === m.title).length > 1 ? `${m.title}（记录尾号${m.id.slice(-4)}）` : m.title }));
  const selected = items.find(m => m.id === active);
  return <div className="stack"><header className="flex-between"><div><h1>{publicMode ? '精选影像' : '录像复盘与相册'}</h1><p className="muted">{publicMode ? '仅展示家长已确认公开的图片和视频。' : '先确认运动员与泳道，再记录时间点观察。'}</p></div>{reload && <button onClick={reload}>刷新处理状态</button>}</header><Message error>{error}</Message>
    {!readOnly && allowUpload && <details className="glass-card"><summary>上传素材</summary><form onSubmit={upload}><div className="form-grid">{FIELDS.media.map(f => <Field key={f.key} field={f} value={form[f.key]} onChange={v => setForm(current => ({ ...current, [f.key]: v }))}/>)}</div><label className="form-group">选择图片或视频<input type="file" required accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm" onChange={e => setFile(e.target.files[0] || null)}/></label><button disabled={busy} className="apple-btn apple-btn-primary">{busy ? `上传${progress}%` : '上传至私有记录库'}</button><p className="muted">支持PNG/JPEG/WebP和MP4/MOV/WebM，100MB以内。上传完成后生成封面与兼容副本；默认不公开。</p></form></details>}
    <label className="search">查找影像<input className="apple-input" value={filter} onChange={e => setFilter(e.target.value)} placeholder="标题、日期、分类"/></label>
    {!items.length && <Empty>尚无符合条件的素材。</Empty>}<div className="media-grid">{items.map(item => <article className="glass-card media-item" key={item.id}><Asset item={item} api={api} publicMode={publicMode} variant={item.type === 'video' ? 'poster' : 'playback'} onPlay={() => { setQuality('playback'); setClipEnd(null); setActive(item.id); }}/>{item.type !== 'video' && <button onClick={() => setActive(item.id)}>查看图片详情</button>}<h2>{item.displayTitle}</h2><p className="muted">{item.date} · {item.category || '未分类'} · {item.id}</p>{!publicMode && <><p>{item.processingStatus || '原片待处理'}</p><p className="muted">{item.processingError}</p><details><summary>原始说明（未作为技术结论审核）</summary><p>{item.description || '尚无说明'}</p></details><p>复盘批注{data.annotations.filter(a => a.mediaId === item.id).length}条</p></>}</article>)}</div>
    {selected && <Modal title={`${selected.date} · ${selected.displayTitle}`} onClose={() => setActive(null)}>{selected.type === 'video' && !publicMode && <label className="form-group">播放质量<select className="apple-input" value={quality} onChange={e => setQuality(e.target.value)}><option value="playback">兼容播放副本（未生成时尝试原片）</option><option value="original">原片（取决于设备支持）</option></select></label>}<Asset item={selected} api={api} publicMode={publicMode} variant={quality} clipEnd={clipEnd}/>{!publicMode && <><h3>时间点批注</h3><button onClick={() => setClipEnd(null)}>取消片段结束限制，查看完整视频</button>{data.annotations.filter(a => a.mediaId === selected.id).map(a => <section className="session" key={a.id}><h4>{a.startSecond}—{a.endSecond}秒 · {a.status}</h4><button onClick={() => { const player = document.querySelector('dialog video'); if (player) { player.currentTime = a.startSecond; setClipEnd(a.endSecond); player.play().catch(() => setError('已定位到片段，请使用播放器播放按钮')); } }}>播放此片段</button><p>运动员/泳道：{a.athleteIdentity || '未确认'}；观察：{a.observation}</p><p>限制：{a.limitation || '未填写'}；建议：{a.suggestion || '未填写'}；审核人：{a.reviewedBy || '未填写'}</p></section>)}{!readOnly && allowUpload && <button onClick={() => remove(selected.id)}>将素材移入回收站</button>}</>}</Modal>}
    {!publicMode && allowUpload && <details className="glass-card"><summary>编辑素材原始说明</summary><Records type="media" data={data} api={api} onSaved={onSaved} readOnly={readOnly} allowAdd={false}/></details>}
    {!publicMode && <details className="glass-card"><summary>添加 / 编辑时间点批注</summary><Records type="annotations" data={data} api={api} onSaved={onSaved} readOnly={readOnly}/></details>}
  </div>;
}
