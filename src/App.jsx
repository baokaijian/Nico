import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { emptyState, normalizeState } from '../shared/domain.mjs';
import { EVIDENCE_COLLECTIONS } from '../shared/plan-engine.mjs';
import { createApi } from './services/api';
import { loadAppView } from './services/app-view';
import { Message, Modal } from './components/ui';
import LoginPanel from './components/LoginPanel';
import LogoutDialog from './components/LogoutDialog';
import { createDraftStore, draftScopeKey } from './services/drafts';
import { MANAGEMENT_NAV, resolveManagementLocation, createManagementPosition, managementSaveRequiresSnapshot } from './services/management';
import ManagementView from './components/ManagementView';
import { installPageHealth } from './services/health';
const Showcase = lazy(() => import('./components/Showcase'));
const adminCapable = import.meta.env.DEV || import.meta.env.VITE_APP_MODE === 'private' || !!import.meta.env.VITE_API_URL;
const QuickEntry = lazy(() => import('./components/QuickEntry'));
const ChangePassword = lazy(() => import('./components/ChangePassword'));
const privateTabs = MANAGEMENT_NAV.map(item => [item.key, item.label]);
const publicTabs = [['home', '概览'], ['results', '成绩'], ['media', '影像']];
const roleLabels = { owner: '家长管理', coach: '协作录入', viewer: '只读访问' };
export default function App() {
  const [data, setData] = useState(emptyState), [tab, setTab] = useState('home'), [role, setRole] = useState('viewer'), [loading, setLoading] = useState(true), [error, setError] = useState(''), [notice, setNotice] = useState(''), [auth, setAuth] = useState(false), [session, setSession] = useState(null), [published, setPublished] = useState(null), [story, setStory] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false), [passwordOpen, setPasswordOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false), [logoutBusy, setLogoutBusy] = useState(false), [logoutError, setLogoutError] = useState('');
  const [entry, setEntry] = useState(null), [resumeVersion, setResumeVersion] = useState(0), [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [location, setLocation] = useState({ section: 'workbench', view: 'home' });
  const entryOpener = useRef(null);
  const positionStore = useRef(null), positionIdentity = useRef(null);
  const [mediaTarget, setMediaTarget] = useState(null), [quickEntry, setQuickEntry] = useState(false);
  const [searchValue, setSearchValue] = useState(''), [searchSeed, setSearchSeed] = useState('');
  const api = useMemo(() => createApi(import.meta.env.VITE_API_URL || ''), []);
  useEffect(()=>installPageHealth(api.health),[api]);
  const [mode, setMode] = useState(() => api.getMode());
  const modeRef = useRef(mode);
  const [publicSnapshot, setPublicSnapshot] = useState(null);
  const lastTabs = useRef({ view: 'home', manage: 'workbench' });
  const authenticated = !!session?.authenticated && !session?.mustChangePassword;
  const [loaded, setLoaded] = useState(false);
  const fullView = adminCapable && authenticated && mode === 'manage';
  const selectedLoaded = fullView ? loaded : !!publicSnapshot;
  const publicData = useMemo(() => ({ ...emptyState(), swim: publicSnapshot?.swim || [], media: publicSnapshot?.media || [] }), [publicSnapshot]);
  const reloadController = useRef(null);
  const hadSession = useRef(false);
  const previousAccount = useRef(null);
  const reload = useCallback(async () => {
    reloadController.current?.abort();
    const controller = new AbortController(); reloadController.current = controller;
    setError(''); setLoading(true);
    try {
      const result = await loadAppView(api, { mode: modeRef.current, adminCapable, base: import.meta.env.BASE_URL, signal: controller.signal, onSession: current => {
        if (controller.signal.aborted) return;
        setSession(current); setRole(current?.role || 'viewer');
        if (!current?.authenticated || current.mustChangePassword || previousAccount.current !== current.username) { setData(emptyState()); setLoaded(false); positionIdentity.current = null; setEntry(null); setQuickMenuOpen(false); }
        previousAccount.current = current?.authenticated ? current.username : null;
        if (hadSession.current && !current?.authenticated) { setNotice('登录已失效，请重新登录；未提交的本机草稿不会自动写入。'); setAuth(modeRef.current === 'manage'); }
        hadSession.current = !!current?.authenticated;
      } });
      if (controller.signal.aborted) return;
      if (result.session?.mustChangePassword) { setAuth(false); return; }
      if (result.privateSnapshot) {
        const current = result.privateSnapshot;
        if (current.revision < api.getRevision()) return;
        setData(normalizeState(current.data)); setLoaded(true); setAuth(false);
        const scope = api.getDraftScope(), identity = draftScopeKey(scope);
        positionStore.current = createManagementPosition({ scope, isCurrent: value => api.getDraftScope() === value });
        if (positionIdentity.current !== identity) { setLocation(positionStore.current.read()); positionIdentity.current = identity; }
        setTab(currentTab => privateTabs.some(([key]) => key === currentTab) ? currentTab : lastTabs.current.manage);
      } else {
        setPublicSnapshot(result.publicSnapshot);
        setPublished(result.publicSnapshot.publishedAt); setStory(result.publicSnapshot.story || '');
        setTab(currentTab => publicTabs.some(([key]) => key === currentTab) ? currentTab : lastTabs.current.view);
      }
    } catch (problem) {
      if (problem.name !== 'AbortError' && !controller.signal.aborted) setError(problem.message);
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, [api]);
  useEffect(() => {
    api.setOnUnauthorized(() => {
      reloadController.current?.abort(); setSession(null); setData(emptyState()); setLoaded(false); setEntry(null); setQuickMenuOpen(false); setRole('viewer');
      setAuth(modeRef.current === 'manage'); setNotice('登录已失效，请重新登录；未提交的本机草稿不会自动写入。');
      void reload();
    });
    return () => api.setOnUnauthorized(() => {});
  }, [api, reload]);
  useEffect(() => {
    if (!session?.expiresAt) return;
    const timer = setTimeout(() => {
      api.resetAuth(); setSession(null); setData(emptyState()); setLoaded(false); setEntry(null); setQuickMenuOpen(false);
      setNotice('登录已到期，请重新登录。'); setAuth(modeRef.current === 'manage'); void reload();
    }, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session?.expiresAt, api, reload]);
  useEffect(() => { reload(); return () => reloadController.current?.abort(); }, [reload]);
  const switchMode = next => {
    lastTabs.current[fullView ? 'manage' : 'view'] = tab;
    modeRef.current = next; api.setMode(next); setMode(next); setUserMenuOpen(false); setNotice('');
    setTab(lastTabs.current[next]); void reload();
  };
  const navigate = (next, type) => {
    if (fullView) { const target = resolveManagementLocation(next, type); setLocation(target); positionStore.current?.write(target); setQuickEntry(next === 'records' && type === 'trainings'); }
    else setTab(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const openQuickEntry = (type, context = {}) => { if (role !== 'owner' && (type === 'skill' || type === 'media' && !context.trainingId)) { setNotice('此录入操作仅限家长管理者。'); return; } entryOpener.current = document.activeElement; setQuickMenuOpen(false); setEntry({ type, context }); };
  const closeEntry = () => { setEntry(null); setResumeVersion(value => value + 1); };
  const onSaved = (collection, record, removedId) => {
    setData(current => {
      if (!Array.isArray(current[collection])) return { ...current, [collection]: record };
      const updated = current[collection].filter(r => r.id !== removedId && r.id !== record?.id);
      return { ...current, [collection]: record ? [...updated, record] : updated };
    });
    if (removedId || managementSaveRequiresSnapshot(collection)) { setNotice('上次提交已获服务端确认。'); reload(); return; }
    if (EVIDENCE_COLLECTIONS.includes(collection)) {
      setNotice('已保存到私有档案。');
      reload();
      return;
    }
    setNotice('上次提交已获服务端确认。');
  };
  const readOnly = !authenticated || role === 'viewer';
    const logout = async (deleteDrafts = false) => {
    const drafts = createDraftStore({ scope: api.getDraftScope() });
    setLogoutBusy(true); setLogoutError('');
    setUserMenuOpen(false);
    let failed = false;
    try { await api.authRequest('logout', {}); } catch {
      if (api.usesCookieSession) { setLogoutError('退出未获服务端确认，请恢复连接后重试；本机草稿仍保留。'); setLogoutBusy(false); return; }
      failed = true;
    }
    reloadController.current?.abort(); api.resetAuth(); setSession(null); setLoaded(false); setData(emptyState());
    const cleared = deleteDrafts ? drafts.clear() : null;
    setLogoutOpen(false); setLogoutBusy(false); setMediaTarget(null); setEntry(null); setQuickMenuOpen(false);
    modeRef.current = 'view'; api.setMode('view'); setMode('view'); setPasswordOpen(false); setAuth(false);
    const draftMessage = deleteDrafts ? cleared.status === 'cleared' ? '已删除本账号的新版草稿。' : '未能确认草稿已清除，请在下次登录后检查。' : '草稿按原账号保留，重新登录后可恢复。';
    setNotice(`${failed ? '已清除本机登录；服务端会话将在有效期结束后失效。' : '已退出账号。'}${draftMessage}`); await reload();
  };
  const runSearch = event => {
    event.preventDefault();
    const query = searchValue.trim();
    setSearchSeed(query);
    if (query || location.section !== 'training') navigate('training', 'swim');
  };
  const tabs = fullView ? privateTabs : publicTabs;
  const tabName = location.section === 'settings' ? '管理设置' : privateTabs.find(([key]) => key === location.section)?.[1] || '';
  return <div className="app">
    <a href="#main" className="skip-link">跳到正文</a>
    <header className="topbar"><div className="topbar-inner">
      <div className="brand"><span className="brand-mark" aria-hidden="true">≈</span><div><b>Nico 游泳成长记录</b><small>{!fullView ? (authenticated ? '查看模式 · 已登录' : '精选摘要') : authenticated ? `${roleLabels[role] || '访问'}` : '只读浏览'}</small></div></div>
      <nav className="main-tabs" aria-label="主要导航">{tabs.map(([key, label]) => <button key={key} className={`tab-btn ${(fullView ? location.section : tab) === key ? 'active' : ''}`} aria-current={(fullView ? location.section : tab) === key ? 'page' : undefined} onClick={() => navigate(key)}>{label}</button>)}</nav>
      <div className="topbar-right">
        <button type="button" className="refresh-trigger" onClick={reload} disabled={loading}>刷新记录</button>
        {adminCapable && (session?.authenticated
          ? <div style={{ position: 'relative' }}>
              {userMenuOpen && <div className="pop-backdrop" onClick={() => setUserMenuOpen(false)} aria-hidden="true"/>}
              <button type="button" className="user-chip" onClick={() => setUserMenuOpen(value => !value)} aria-expanded={userMenuOpen} aria-haspopup="menu" aria-label={`${session.username || '管理员'}，已登录，${fullView ? '管理模式' : '查看模式'}`}><span className="user-avatar" aria-hidden="true">{(roleLabels[role] || '访')[0]}</span>{fullView ? '管理模式' : '查看模式'} ▾</button>
              {userMenuOpen && <div className="user-menu" role="menu">
                {authenticated && role === 'owner' && <button type="button" role="menuitem" onClick={() => { modeRef.current = 'manage'; api.setMode('manage'); setMode('manage'); setUserMenuOpen(false); const target = resolveManagementLocation('settings'); setLocation(target); positionStore.current?.write(target); void reload(); }}>管理设置</button>}
                {authenticated && <button type="button" role="menuitem" onClick={() => switchMode(fullView ? 'view' : 'manage')}>{fullView ? '切换到查看模式' : '返回管理模式'}</button>}
                <button type="button" role="menuitem" onClick={() => { setUserMenuOpen(false); setPasswordOpen(true); }}>修改密码</button>
                <button type="button" role="menuitem" className="danger" onClick={() => { setUserMenuOpen(false); setLogoutError(''); setLogoutOpen(true); }}>退出登录</button>
              </div>}
            </div>
          : <button type="button" className="login-trigger" onClick={() => { setAuth(true); setError(''); }}>登录</button>)}
        {auth && adminCapable && <LoginPanel api={api} setupRequired={session?.setupRequired} onLoggedIn={async () => { setAuth(false); setNotice(''); modeRef.current = 'manage'; api.setMode('manage'); setMode('manage'); await reload(); }} onClose={() => setAuth(false)}/>}
      </div>
    </div></header>
    {fullView && <div className="ctxbar"><div className="ctxbar-inner">
      <nav className="crumb" aria-label="当前位置"><b>{tabName}</b><span className="crumb-sub">完整档案 · 公开展示需单独选择</span></nav>
      <form className="record-search" onSubmit={runSearch} role="search"><input className="apple-input" value={searchValue} onChange={e => setSearchValue(e.target.value)} placeholder="日期 / 项目 / 备注" aria-label="查找记录"/><button type="submit">查找</button></form>
    </div></div>}
    <div className="shell">
      <main id="main" className="pane">
        <Message error>{error}</Message><Message>{notice}</Message>
        {session?.authenticated && session.mustChangePassword
          ? <Suspense fallback={<Message>正在打开账号设置…</Message>}><ChangePassword api={api} onChanged={reload}/></Suspense>
          : loading && !selectedLoaded ? <Message>正在读取记录…</Message> : !selectedLoaded ? <Message>暂时无法读取内容，请检查连接并刷新。</Message> : <Suspense key={session?.authenticated ? session.username : 'guest'} fallback={<Message>正在打开页面…</Message>}>
            {fullView && <ManagementView location={location} navigate={navigate} data={data} api={api} onSaved={onSaved} reload={reload} readOnly={readOnly} role={role} openQuickEntry={openQuickEntry} initialOpen={quickEntry} initialFilter={searchSeed} mediaTarget={mediaTarget} resumeVersion={resumeVersion}/>}
            {!fullView && <Showcase view={publicTabs.some(([key]) => key === tab) ? tab : 'home'} data={publicData} published={published} story={story} api={adminCapable ? api : undefined} onNavigate={navigate}/>}
          </Suspense>}
        {fullView && entry && !readOnly && <Suspense fallback={<Message>正在打开快捷录入…</Message>}><QuickEntry key={entry.type} {...entry} data={data} api={api} onSaved={onSaved} reload={reload} onClose={closeEntry} navigate={navigate} role={role} restoreFocus={() => { const target = entryOpener.current?.isConnected ? entryOpener.current : document.querySelector('.mobile-quick-entry > button'); target?.focus(); }}/></Suspense>}
        {passwordOpen && session?.authenticated && <Suspense fallback={<Message>正在打开账号设置…</Message>}><Modal title="修改管理员密码" onClose={() => setPasswordOpen(false)}><ChangePassword api={api} onChanged={async () => { setPasswordOpen(false); await reload(); }}/></Modal></Suspense>}
        {logoutOpen && <LogoutDialog api={api} busy={logoutBusy} error={logoutError} onLogout={logout} onClose={() => { if (!logoutBusy) setLogoutOpen(false); }}/>}
      </main>
    </div>
    {fullView && !readOnly && !entry && <div className="mobile-quick-entry">{quickMenuOpen && <div className="mobile-quick-options">{[['training','记录训练'],['score','记录成绩'],['skill','技能测评'],['media','添加影像']].map(([type,name]) => <button key={type} disabled={role !== 'owner' && ['skill','media'].includes(type)} onClick={() => openQuickEntry(type)}>{name}</button>)}</div>}<button className="apple-btn apple-btn-primary" aria-expanded={quickMenuOpen} onClick={() => setQuickMenuOpen(value => !value)}>快捷录入</button></div>}
    <footer className="app-footer">公开内容经家长授权 · 完整档案需登录 · <a href={`${import.meta.env.BASE_URL}third-party-notices.html`} target="_blank" rel="noreferrer">开源组件声明</a></footer>
  </div>;
}
