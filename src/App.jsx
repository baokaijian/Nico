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
const adminCapable = import.meta.env.DEV || import.meta.env.VITE_APP_MODE === 'private' || !!import.meta.env.VITE_API_URL;
const AdminLogin = lazy(() => import('./components/AdminLogin'));
const ChangePassword = lazy(() => import('./components/ChangePassword'));
const privateTabs = [['today', '今日'], ['week', '本周'], ['records', '记录'], ['review', '复盘'], ['profile', '档案']];
const publicTabs = [['results', '公开成绩'], ['media', '公开影像']];
const recordTypes = [['trainings', '水上训练'], ['swim', '成绩'], ['fitness', '体能'], ['nutrition', '恢复与饮食'], ['growth', '身体测量']];
export default function App() {
  const [data, setData] = useState(emptyState), [tab, setTab] = useState('results'), [recordType, setRecordType] = useState('trainings'), [reviewTab, setReviewTab] = useState('report'), [role, setRole] = useState('viewer'), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [auth, setAuth] = useState(false), [session, setSession] = useState(null), [published, setPublished] = useState(null);
  const api = useMemo(() => createApi(import.meta.env.VITE_API_URL || ''), []);
  const privateMode = !!session?.authenticated && !session?.mustChangePassword;
  const [loaded, setLoaded] = useState(false);
  const reloadController = useRef(null);
  const reload = useCallback(async () => {
    reloadController.current?.abort();
    const controller = new AbortController(); reloadController.current = controller;
    setError('');
    try {
      const currentSession = adminCapable ? await api.authRequest('session', undefined, { signal: controller.signal }) : null;
      if (controller.signal.aborted) return;
      if (currentSession?.authenticated && !currentSession.mustChangePassword) {
        const current = await api.request('/api/snapshot', { signal: controller.signal });
        if (controller.signal.aborted || current.revision < api.getRevision()) return;
        setSession(currentSession);
        setData(normalizeState(current.data)); setRole(current.role); setAuth(false); setLoaded(true);
        setTab(currentTab => publicTabs.some(([key]) => key === currentTab) ? 'today' : currentTab);
      } else {
        setSession(currentSession);
        if (!currentSession?.authenticated) api.resetAuth();
        const snapshot = adminCapable ? await api.request('/api/public-summary', { signal: controller.signal }) : await (async () => {
          const response = await fetch(`${import.meta.env.BASE_URL}public-summary.json`, { cache: 'no-store', signal: controller.signal });
          if (!response.ok) throw new Error('公开摘要加载失败，请重试');
          return response.json();
        })();
        setData({ ...emptyState(), swim: snapshot.swim || [], media: snapshot.media || [] });
        setPublished(snapshot.publishedAt); setRole('viewer'); setLoaded(true);
        setTab(currentTab => publicTabs.some(([key]) => key === currentTab) ? currentTab : 'results');
      }
    } catch (problem) { if (problem.name === 'AbortError') return; if (problem.status === 401) { api.resetAuth(); setSession(null); setAuth(true); setData(emptyState()); setLoaded(false); } setError(problem.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [api]);
  useEffect(() => { api.setOnUnauthorized(() => { reloadController.current?.abort(); api.resetAuth(); setSession(null); setData(emptyState()); setRole('viewer'); setLoaded(false); setAuth(true); setNotice('登录已失效，请重新登录；未提交的本机草稿不会自动写入。'); }); return () => api.setOnUnauthorized(() => {}); }, [api]);
  useEffect(() => { if (!session?.expiresAt) return; const timer = setTimeout(() => { api.resetAuth(); setSession(null); setData(emptyState()); setNotice('登录已到期，请重新登录。'); reload(); }, Math.max(0, session.expiresAt - Date.now())); return () => clearTimeout(timer); }, [session?.expiresAt, api, reload]);
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
    <main id="main" className="container"><div className="status-line"><span>{privateMode ? loaded ? error ? '上次成功读取的记录 · 连接状态待确认' : '事实库：本次读取的服务端记录' : '尚未读取事实库' : `摘要发布日期：${published || '尚未选择公开内容'}`}</span><div className="actions"><button onClick={reload}>刷新记录</button>{adminCapable && (session?.authenticated ? <button onClick={async () => { try { await api.authRequest('logout', {}); reloadController.current?.abort(); api.resetAuth(); setSession(null); setLoaded(false); setData(emptyState()); setNotice('已退出管理员账号'); await reload(); } catch (problem) { setError(problem.message); } }}>退出登录</button> : <button onClick={() => { setAuth(true); setError(''); }}>管理员登录</button>)}</div></div><Message error>{error}</Message><Message>{notice}</Message>
      {session?.authenticated && session.mustChangePassword ? <Suspense fallback={<Message>正在打开账号设置…</Message>}><ChangePassword api={api} onChanged={reload}/></Suspense> : auth ? <Suspense fallback={<Message>正在打开登录页面…</Message>}><AdminLogin api={api} setupRequired={session?.setupRequired} onLoggedIn={reload} onClose={() => setAuth(false)}/></Suspense> : loading ? <Message>正在读取记录…</Message> : !loaded ? <Message>暂时无法读取内容，请检查连接并刷新。</Message> : <Suspense fallback={<Message>正在打开页面…</Message>}>
        {privateMode && tab === 'today' && <Dashboard data={data} navigate={navigate}/>}
        {privateMode && tab === 'week' && <Plans data={data} api={api} onSaved={onSaved} readOnly={readOnly}/>}
        {privateMode && tab === 'records' && <><div className="sub-nav" aria-label="记录类型">{recordTypes.map(([key, label]) => <button key={key} aria-pressed={recordType === key} onClick={() => setRecordType(key)}>{label}</button>)}</div><Records key={recordType} type={recordType} data={data} api={api} onSaved={onSaved} readOnly={!canEditRecords}/></>}
        {privateMode && tab === 'review' && <><div className="sub-nav"><button aria-pressed={reviewTab === 'report'} onClick={() => setReviewTab('report')}>周期报告</button><button aria-pressed={reviewTab === 'media'} onClick={() => setReviewTab('media')}>录像复盘</button></div>{reviewTab === 'report' ? <Reports data={data}/> : <Gallery data={data} api={api} onSaved={onSaved} reload={reload} readOnly={readOnly} allowUpload={role === 'owner'}/>}</>}
        {privateMode && tab === 'profile' && <Profile data={data} api={api} onSaved={onSaved} reload={reload} readOnly={readOnly} role={role}/>}
        {!privateMode && tab === 'results' && <Records type="swim" data={data} readOnly publicMode/>}
        {!privateMode && tab === 'media' && <Gallery data={data} api={adminCapable ? api : undefined} readOnly publicMode/>}
      </Suspense>}
    </main><footer className="app-footer">{privateMode ? '依据录入记录生成分析 · 训练建议需教练确认' : '公开精选内容 · 发布范围由家长确认'} · <a href={`${import.meta.env.BASE_URL}third-party-notices.html`} target="_blank" rel="noreferrer">开源组件声明</a></footer></div>;
}
