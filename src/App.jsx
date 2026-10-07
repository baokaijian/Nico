import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { emptyState, normalizeState } from '../shared/domain.mjs';
import { createApi } from './services/api';
import { Message } from './components/ui';
const Dashboard = lazy(() => import('./components/Dashboard'));
const Plans = lazy(() => import('./components/PlanViewer'));
const Records = lazy(() => import('./components/Records'));
const Reports = lazy(() => import('./components/Reports'));
const Gallery = lazy(() => import('./components/MediaGallery'));
const Profile = lazy(() => import('./components/Profile'));
const privateMode = import.meta.env.DEV || import.meta.env.VITE_APP_MODE === 'private';
const privateTabs = [['today', '今日'], ['week', '本周'], ['records', '记录'], ['review', '复盘'], ['profile', '档案']];
const publicTabs = [['story', '成长故事'], ['results', '精选成绩'], ['media', '精选影像']];
const recordTypes = [['trainings', '水上训练'], ['swim', '成绩'], ['fitness', '体能'], ['nutrition', '恢复与饮食'], ['growth', '身体测量']];
export default function App() {
  const [data, setData] = useState(emptyState), [tab, setTab] = useState(privateMode ? 'today' : 'story'), [recordType, setRecordType] = useState('trainings'), [reviewTab, setReviewTab] = useState('report'), [role, setRole] = useState('viewer'), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [auth, setAuth] = useState(false), [token, setToken] = useState(''), [published, setPublished] = useState(null);
  const api = useMemo(() => createApi(import.meta.env.VITE_API_URL || '', () => sessionStorage.getItem('nico_access_token') || ''), []);
  const [loaded, setLoaded] = useState(false);
  const reloadController = useRef(null);
  const reload = useCallback(async () => {
    reloadController.current?.abort();
    const controller = new AbortController(); reloadController.current = controller;
    setError('');
    try {
      if (privateMode) { const current = await api.request('/api/snapshot', { signal: controller.signal }); if (current.revision < api.getRevision()) return; setData(normalizeState(current.data)); setRole(current.role); setAuth(false); setLoaded(true); }
      else {
        const response = await fetch(`${import.meta.env.BASE_URL}public-summary.json`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('公开摘要加载失败，请重试');
        const snapshot = await response.json();
        setData({ ...emptyState(), swim: snapshot.swim || [], media: snapshot.media || [], story: snapshot.story || '' }); setPublished(snapshot.publishedAt); setLoaded(true);
      }
    } catch (problem) { if (problem.name === 'AbortError') return; if (problem.status === 401) { setAuth(true); setData(emptyState()); setLoaded(false); } setError(problem.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [api]);
  useEffect(() => { reload(); return () => reloadController.current?.abort(); }, [reload]);
  const navigate = (next, type) => { setTab(next); if (type) setRecordType(type); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const onSaved = (collection, record, removedId) => {
    setData(current => {
      if (!Array.isArray(current[collection])) return { ...current, [collection]: record };
      const updated = current[collection].filter(r => r.id !== removedId && r.id !== record?.id);
      return { ...current, [collection]: record ? [...updated, record] : updated };
    });
    setNotice('上次提交已获服务端确认。');
    if (removedId || collection === 'plans') reload();
  };
  const readOnly = !privateMode || role === 'viewer';
  const canEditRecords = !readOnly && (role === 'owner' || ['swim', 'trainings'].includes(recordType));
  return <div><a href="#main" className="skip-link">跳到正文</a><nav className="glass-nav" aria-label="主要导航"><div className="nav-brand"><span className="brand-mark" aria-hidden="true">≈</span><div>Nico 游泳成长记录<small>{privateMode ? `${role === 'owner' ? '家长管理' : role === 'coach' ? '教练协作' : '只读访问'} · 私有记录` : '公开精选摘要'}</small></div></div><div className="nav-tabs">{(privateMode ? privateTabs : publicTabs).map(([key, label]) => <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} aria-current={tab === key ? 'page' : undefined} onClick={() => navigate(key)}>{label}</button>)}</div></nav>
    <main id="main" className="container"><div className="status-line"><span>{privateMode ? loaded ? error ? '上次成功读取的记录 · 连接状态待确认' : '事实库：本次读取的服务端记录' : '尚未读取事实库' : `摘要发布日期：${published || '尚未选择公开内容'}`}</span><div className="actions"><button onClick={reload}>刷新记录</button>{privateMode && sessionStorage.getItem('nico_access_token') && <button onClick={() => { reloadController.current?.abort(); sessionStorage.removeItem('nico_access_token'); setLoaded(false); setData(emptyState()); setRole('viewer'); setAuth(true); }}>退出访问</button>}</div></div><Message error>{error}</Message><Message>{notice}</Message>
      {auth ? <form className="glass-card login" onSubmit={async e => { e.preventDefault(); sessionStorage.setItem('nico_access_token', token); setToken(''); await reload(); }}><h1>访问私有档案</h1><label className="form-group">访问密钥<input className="apple-input" type="password" value={token} onChange={e => setToken(e.target.value)} required autoComplete="off"/></label><button className="apple-btn apple-btn-primary">验证并读取记录</button><p className="muted">密钥由私有服务管理者配置，权限由服务端验证。</p></form> : loading ? <Message>正在读取实际记录…</Message> : !loaded ? <Message>尚未读取到记录，请连接服务并刷新后再显示分析。</Message> : <Suspense fallback={<Message>正在打开页面…</Message>}>
        {privateMode && tab === 'today' && <Dashboard data={data} navigate={navigate}/>}
        {privateMode && tab === 'week' && <Plans data={data} api={api} onSaved={onSaved} readOnly={readOnly}/>}
        {privateMode && tab === 'records' && <><div className="sub-nav" aria-label="记录类型">{recordTypes.map(([key, label]) => <button key={key} aria-pressed={recordType === key} onClick={() => setRecordType(key)}>{label}</button>)}</div><Records key={recordType} type={recordType} data={data} api={api} onSaved={onSaved} readOnly={!canEditRecords}/></>}
        {privateMode && tab === 'review' && <><div className="sub-nav"><button aria-pressed={reviewTab === 'report'} onClick={() => setReviewTab('report')}>周期报告</button><button aria-pressed={reviewTab === 'media'} onClick={() => setReviewTab('media')}>录像复盘</button></div>{reviewTab === 'report' ? <Reports data={data}/> : <Gallery data={data} api={api} onSaved={onSaved} reload={reload} readOnly={readOnly} allowUpload={role === 'owner'}/>}</>}
        {privateMode && tab === 'profile' && <Profile data={data} api={api} onSaved={onSaved} reload={reload} readOnly={readOnly} role={role}/>}
        {!privateMode && tab === 'story' && <section className="glass-card"><p className="eyebrow">Nico的成长记录</p><h1>一点一滴，记录进步</h1><p>{data.story || '家长尚未选择可公开的成长内容。私有记录未包含在此页面。'}</p></section>}
        {!privateMode && tab === 'results' && <Records type="swim" data={data} readOnly publicMode/>}
        {!privateMode && tab === 'media' && <Gallery data={data} readOnly publicMode/>}
      </Suspense>}
    </main><footer className="app-footer">{privateMode ? '依据录入记录生成分析 · 训练建议需教练确认' : '公开精选内容 · 发布范围由家长确认'}</footer></div>;
}
