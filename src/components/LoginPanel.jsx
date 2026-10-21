import { useEffect, useRef, useState } from 'react';
import { Message } from './ui';
export default function LoginPanel({ api, setupRequired, onLoggedIn, onClose }) {
  const [username, setUsername] = useState('admin'), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const firstInput = useRef(null);
  useEffect(() => { firstInput.current?.focus(); }, []);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const submit = async event => {
    event.preventDefault(); setError('');
    if (setupRequired && password !== confirmation) { setError('两次输入的密码不一致'); return; }
    setBusy(true);
    try { await api.authRequest(setupRequired ? 'setup' : 'login', { username, password, ...(setupRequired ? { code } : {}) }); setPassword(''); setConfirmation(''); setCode(''); await onLoggedIn(); }
    catch (problem) { setError(problem instanceof TypeError ? '无法连接登录服务，请稍后重试' : problem.message); }
    finally { setBusy(false); }
  };
  return <>
    <div className="pop-backdrop" onClick={onClose} aria-hidden="true"/>
    <div className="login-pop" role="dialog" aria-modal="true" aria-labelledby="login-pop-title">
      <div className="login-pop-head" id="login-pop-title">{setupRequired ? '首次登录需设置管理员账号' : '登录管理平台'}</div>
      <form className="login-pop-body" onSubmit={submit}>
        <Message error>{error}</Message>
        <label className="form-group">管理员账号<input ref={firstInput} className="apple-input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={32}/></label>
        <label className="form-group">{setupRequired ? '设置密码（至少12位）' : '密码'}<input className="apple-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={setupRequired ? 'new-password' : 'current-password'} required minLength={setupRequired ? 12 : undefined} maxLength={128}/></label>
        {setupRequired && <>
          <label className="form-group">再次输入密码<input className="apple-input" type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="new-password" required/></label>
          <label className="form-group">本机初始化码<input className="apple-input" value={code} onChange={e => setCode(e.target.value)} autoComplete="off" required/></label>
          <p className="login-pop-hint">初始化码位于本机的 data/admin-setup-code.txt，仅首次设置时使用，设置完成后自动删除。</p>
        </>}
        <button className="apple-btn apple-btn-primary" disabled={busy}>{busy ? '正在验证…' : setupRequired ? '创建账号并登录' : '登录'}</button>
        <p className="login-pop-hint">不登录可查看公开概览、成绩和授权影像；完整档案、训练计划和录入需登录。当前标签页在会话有效期内保持登录，刷新无需重复输入密码；登录后可在账号菜单切换查看模式。按 Esc 可关闭。</p>
      </form>
    </div>
  </>;
}
