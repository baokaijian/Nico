import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { emptyState, normalizeState } from '../shared/domain.mjs';
import { EVIDENCE_COLLECTIONS } from '../shared/plan-engine.mjs';
import { createApi } from './services/api';
import { loadPublicSummary } from './services/public-summary';
import { Message, Modal } from './components/ui';
import LoginPanel from './components/LoginPanel';
const Dashboard = lazy(() => import('./components/Dashboard'));
const Plans = lazy(() => import('./components/PlanViewer'));
const Records = lazy(() => import('./components/Records'));
const Reports = lazy(() => import('./components/Reports'));
const Practice = lazy(() => import('./components/Practice'));
const Gallery = lazy(() => import('./components/MediaGallery'));
const Showcase = lazy(() => import('./components/Showcase'));
const Profile = lazy(() => import('./components/Profile'));
const adminCapable = import.meta.env.DEV || import.meta.env.VITE_APP_MODE === 'private' || !!import.meta.env.VITE_API_URL;
const ChangePassword = lazy(() => import('./components/ChangePassword'));
const privateTabs = [['today', '今日'], ['week', '本周'], ['practice', '打卡'], ['records', '记录'], ['review', '复盘'], ['profile', '档案']];
const publicTabs = [['home', '概览'], ['results', '成绩'], ['media', '影像']];
const recordTypes = [['trainings', '水上训练'], ['swim', '成绩'], ['fitness', '体能'], ['nutrition', '恢复与饮食'], ['growth', '身体测量']];
const roleLabels = { owner: '家长管理', coach: '协作录入', viewer: '只读访问' };
const privateSidebar = [
  { title: '分析与计划', items: [
    { label: '今日', short: '今日', tab: 'today' },
    { label: '本周计划', short: '本周', tab: 'week' },
    { label: '周期报告', short: '报告', tab: 'review', review: 'report' },
    { label: '录像复盘', short: '录像', tab: 'review', review: 'media' },
  ] },
  { title: '录入', items: [
    { label: '成绩', short: '成绩', tab: 'records', type: 'swim' },
    { label: '水上训练', short: '训练', tab: 'records', type: 'trainings' },
    { label: '体能', short: '体能', tab: 'records', type: 'fitness' },
    { label: '恢复与饮食', short: '恢复', tab: 'records', type: 'nutrition' },
    { label: '身体测量', short: '测量', tab: 'records', type: 'growth' },
  ] },
  { title: '成长', items: [
    { label: '薄弱点打卡', short: '打卡', tab: 'practice' },
  ] },
  { title: '系统', items: [
    { label: '档案', short: '档案', tab: 'profile' },
  ] },
];
const publicSidebar = [
  { title: '内容', items: [
    { label: '概览', short: '概览', tab: 'home' },
    { label: '成绩', short: '成绩', tab: 'results' },
    { label: '影像', short: '影像', tab: 'media' },
  ] },
];
export default function App() {
  const [data, setData] = useState(emptyState), [tab, setTab] = useState('home'), [recordType, setRecordType] = useState('trainings'), [reviewTab, setReviewTab] = useState('report'), [role, setRole] = useState('viewer'), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [auth, setAuth] = useState(false), [session, setSession] = useState(null), [published, setPublished] = useState(null), [story, setStory] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false), [navOpen, setNavOpen] = useState(false), [passwordOpen, setPasswordOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(''), [searchSeed, setSearchSeed] = useState('');
  const api = useMemo(() => createApi(import.meta.env.VITE_API_URL || ''), []);
  const [publicFallback, setPublicFallback] = useState(false);
  const authenticated = !!session?.authenticated && !session?.mustChangePassword;
  const [loaded, setLoaded] = useState(false);
  const fullView = adminCapable && authenticated && loaded && !publicFallback;
  const reloadController = useRef(null);
  // Only a request made with credentials can mean "session lost"; an anonymous 401 is a server-side read policy, not a login prompt.
  const hadSession = useRef(false);
  const reload = useCallback(async () => {
    reloadController.current?.abort();
    const controller = new AbortController(); reloadController.current = controller;
    setError('');
    const publishedFallback = async () => {
      const snapshot = await loadPublicSummary(api, { live: adminCapable, base: import.meta.env.BASE_URL, signal: controller.signal });
      if (controller.signal.aborted) return;
      setData({ ...emptyState(), swim: snapshot.swim || [], media: snapshot.media || [] });
      setPublished(snapshot.publishedAt); setStory(snapshot.story || ''); setRole('viewer'); setLoaded(true); setPublicFallback(true);
      setTab(currentTab => publicTabs.some(([key]) => key === currentTab) ? currentTab : 'home');
    };
    try {
      const currentSession = adminCapable ? await api.authRequest('session', undefined, { signal: controller.signal }) : null;
      if (controller.signal.aborted) return;
      setSession(currentSession);
      hadSession.current = !!currentSession?.authenticated;
      if (!currentSession?.authenticated) {
        api.resetAuth(); setData(emptyState()); setLoaded(false); setPublicFallback(true);
        await publishedFallback();
      } else if (currentSession.mustChangePassword) {
        setData(emptyState()); setLoaded(false); setAuth(false); setRole(currentSession.role);
      } else {
        const current = await api.request('/api/snapshot', { signal: controller.signal });
        if (controller.signal.aborted || current.revision < api.getRevision()) return;
        setData(normalizeState(current.data));
        setRole(currentSession?.authenticated ? currentSession.role : 'viewer');
        setAuth(false); setLoaded(true); setPublicFallback(false);
        setTab(currentTab => privateTabs.some(([key]) => key === currentTab) ? currentTab : 'today');
      }
    } catch (problem) {
      if (problem.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      if (problem.status === 401 && hadSession.current) { api.resetAuth(); setSession(null); setAuth(true); setData(emptyState()); setLoaded(false); setNotice('登录已失效，请重新登录；未提交的本机草稿不会自动写入。'); }
      else setError(problem.message);
    }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [api]);
  useEffect(() => { api.setOnUnauthorized(() => { reloadController.current?.abort(); api.resetAuth(); setSession(null); setData(emptyState()); setRole('viewer'); setLoaded(false); setAuth(true); setNotice('登录已失效，请重新登录；未提交的本机草稿不会自动写入。'); }); return () => api.setOnUnauthorized(() => {}); }, [api]);
  useEffect(() => { if (!session?.expiresAt) return; const timer = setTimeout(() => { api.resetAuth(); setSession(null); setData(emptyState()); setNotice('登录已到期，请重新登录。'); setAuth(true); reload(); }, Math.max(0, session.expiresAt - Date.now())); return () => clearTimeout(timer); }, [session?.expiresAt, api, reload]);
  useEffect(() => { reload(); return () => reloadController.current?.abort(); }, [reload]);
  useEffect(() => {
    if (!navOpen) return;
    const close = event => { if (event.key === 'Escape') { setNavOpen(false); document.querySelector('.nav-toggle')?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [navOpen]);
  const navigate = (next, type) => { setTab(next); if (type) setRecordType(type); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const goSidebar = item => { setTab(item.tab); if (item.type) setRecordType(item.type); if (item.review) setReviewTab(item.review); setNavOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const onSaved = (collection, record, removedId) => {
    setData(current => {
      if (!Array.isArray(current[collection])) return { ...current, [collection]: record };
      const updated = current[collection].filter(r => r.id !== removedId && r.id !== record?.id);
      return { ...current, [collection]: record ? [...updated, record] : updated };
    });
    if (removedId || collection === 'plans') { setNotice('上次提交已获服务端确认。'); reload(); return; }
    if (EVIDENCE_COLLECTIONS.includes(collection)) {
      setNotice(<>上次提交已获服务端确认，计划草稿已依据本次记录同步更新。<button type="button" className="apple-btn apple-btn-secondary" onClick={() => navigate('week')}>查看本周计划草稿</button></>);
      reload();
      return;
    }
    setNotice('上次提交已获服务端确认。');
  };
  const readOnly = !authenticated || role === 'viewer';
  const canEditRecords = !readOnly && (role === 'owner' || ['swim', 'trainings'].includes(recordType));
  const logout = async () => {
    setUserMenuOpen(false);
    try { await api.authRequest('logout', {}); reloadController.current?.abort(); api.resetAuth(); setSession(null); setLoaded(false); setData(emptyState()); setNotice('已退出管理员账号'); await reload(); }
    catch (problem) { setError(problem.message); }
  };
  const runSearch = event => {
    event.preventDefault();
    const query = searchValue.trim();
    setSearchSeed(query);
    setNavOpen(false);
    if (query || tab !== 'records') navigate('records');
  };
  const tabs = fullView ? privateTabs : publicTabs;
  const sidebarGroups = fullView ? privateSidebar : publicSidebar;
  const tabName = (fullView ? privateTabs : publicTabs).find(([key]) => key === tab)?.[1] || '';
  const recordTypeName = recordTypes.find(([key]) => key === recordType)?.[1] || '';
  const statusText = !fullView
    ? published ? `摘要发布：${published}` : ''
    : !loaded ? '尚未读取事实库'
      : error ? '上次成功读取的记录 · 连接状态待确认'
        : authenticated ? '事实库：本次读取的服务端记录' : '只读浏览 · 登录后可录入与修改';
  const itemActive = item => item.tab === tab && (!item.type || item.type === recordType) && (!item.review || item.review === reviewTab);
  return <div className={`app ${navOpen ? 'nav-open' : ''}`}>
    <a href="#main" className="skip-link">跳到正文</a>
    <header className="topbar"><div className="topbar-inner">
      <button type="button" className="nav-toggle" onClick={() => setNavOpen(value => !value)} aria-expanded={navOpen} aria-label={navOpen ? '关闭导航' : '打开导航'}><i/><i/><i/></button>
      <div className="brand"><span className="brand-mark" aria-hidden="true">≈</span><div><b>Nico 游泳成长记录</b><small>{!fullView ? '精选摘要' : authenticated ? `${roleLabels[role] || '访问'}` : '只读浏览'}</small></div></div>
      <nav className="main-tabs" aria-label="主要导航">{tabs.map(([key, label]) => <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} aria-current={tab === key ? 'page' : undefined} onClick={() => navigate(key)}>{label}</button>)}</nav>
      <div className="topbar-right">
        {fullView && <form className="topbar-search" onSubmit={runSearch} role="search"><input className="apple-input" value={searchValue} onChange={e => setSearchValue(e.target.value)} placeholder="查找记录（日期 / 项目 / 备注）" aria-label="查找记录"/><button type="submit">查找</button></form>}
        {adminCapable && (session?.authenticated
          ? <div style={{ position: 'relative' }}>
              {userMenuOpen && <div className="pop-backdrop" onClick={() => setUserMenuOpen(false)} aria-hidden="true"/>}
              <button type="button" className="user-chip" onClick={() => setUserMenuOpen(value => !value)} aria-expanded={userMenuOpen} aria-haspopup="menu"><span className="user-avatar" aria-hidden="true">{(roleLabels[role] || '访')[0]}</span>{roleLabels[role] || '访问'} ▾</button>
              {userMenuOpen && <div className="user-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setUserMenuOpen(false); setPasswordOpen(true); }}>修改密码</button>
                <button type="button" role="menuitem" className="danger" onClick={logout}>退出登录</button>
              </div>}
            </div>
          : <button type="button" className="login-trigger" onClick={() => { setAuth(true); setError(''); }}>登录</button>)}
        {auth && adminCapable && <LoginPanel api={api} setupRequired={session?.setupRequired} onLoggedIn={async () => { setAuth(false); await reload(); }} onClose={() => setAuth(false)}/>}
      </div>
    </div></header>
    <div className="ctxbar"><div className="ctxbar-inner">
      <nav className="crumb" aria-label="当前位置"><b>{tabName}</b>{fullView && tab === 'records' && <> / {recordTypeName}</>}{fullView && tab === 'review' && <> / {reviewTab === 'report' ? '周期报告' : '录像复盘'}</>}<span className="crumb-sub">{statusText}</span></nav>
      {fullView && tab === 'records' && <div className="ctx-tabs" role="group" aria-label="记录类型">{recordTypes.map(([key, label]) => <button key={key} aria-pressed={recordType === key} onClick={() => setRecordType(key)}>{label}</button>)}</div>}
      {fullView && tab === 'review' && <div className="ctx-tabs" role="group" aria-label="复盘内容"><button aria-pressed={reviewTab === 'report'} onClick={() => setReviewTab('report')}>周期报告</button><button aria-pressed={reviewTab === 'media'} onClick={() => setReviewTab('media')}>录像复盘</button></div>}
      <div className="ctx-actions">
        {fullView && !readOnly && tab === 'today' && <button className="apple-btn apple-btn-primary" onClick={() => navigate('records', 'trainings')}>记录本次训练</button>}
        <button onClick={() => { setNavOpen(false); reload(); }}>刷新记录</button>
      </div>
    </div></div>
    <div className="shell">
      <aside className="sidebar" aria-label="分区导航">
        {sidebarGroups.map(group => <div key={group.title}>
          <p className="side-group-title">{group.title}</p>
          {group.items.map(item => <button key={`${group.title}-${item.label}`} type="button" className={`side-item ${itemActive(item) ? 'on' : ''}`} data-short={item.short} aria-current={itemActive(item) ? 'true' : undefined} onClick={() => goSidebar(item)}><span className="side-label">{item.label}</span></button>)}
        </div>)}
      </aside>
      {navOpen && <div className="drawer-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true"/>}
      <main id="main" className="pane">
        <Message error>{error}</Message><Message>{notice}</Message>
        {session?.authenticated && session.mustChangePassword
          ? <Suspense fallback={<Message>正在打开账号设置…</Message>}><ChangePassword api={api} onChanged={reload}/></Suspense>
          : loading ? <Message>正在读取记录…</Message> : !loaded ? <Message>暂时无法读取内容，请检查连接并刷新。</Message> : <Suspense fallback={<Message>正在打开页面…</Message>}>
            {fullView && tab === 'today' && <Dashboard data={data} navigate={navigate} readOnly={readOnly}/>}
            {fullView && tab === 'week' && <Plans data={data} api={api} onSaved={onSaved} readOnly={readOnly} navigate={navigate}/>}
            {fullView && tab === 'practice' && <Practice data={data} api={api} onSaved={onSaved} readOnly={readOnly} navigate={navigate}/>}
            {fullView && tab === 'records' && <Records key={recordType} type={recordType} data={data} api={api} onSaved={onSaved} readOnly={!canEditRecords} initialFilter={searchSeed}/>}
            {fullView && tab === 'review' && (reviewTab === 'report' ? <Reports data={data}/> : <Gallery data={data} api={api} onSaved={onSaved} reload={reload} readOnly={readOnly} allowUpload={role === 'owner'}/>)}
            {fullView && tab === 'profile' && <Profile data={data} api={api} onSaved={onSaved} reload={reload} readOnly={readOnly} role={role}/>}
            {!fullView && <Showcase view={publicTabs.some(([key]) => key === tab) ? tab : 'home'} data={data} published={published} story={story} api={adminCapable ? api : undefined} onNavigate={navigate}/>}
          </Suspense>}
        {passwordOpen && session?.authenticated && <Suspense fallback={<Message>正在打开账号设置…</Message>}><Modal title="修改管理员密码" onClose={() => setPasswordOpen(false)}><ChangePassword api={api} onChanged={async () => { setPasswordOpen(false); await reload(); }}/></Modal></Suspense>}
      </main>
    </div>
    <footer className="app-footer">公开内容经家长授权 · 完整档案需登录 · <a href={`${import.meta.env.BASE_URL}third-party-notices.html`} target="_blank" rel="noreferrer">开源组件声明</a></footer>
  </div>;
}
