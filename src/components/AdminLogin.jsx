import { useState } from 'react';
import { Message } from './ui';
export default function AdminLogin({ api, setupRequired, onLoggedIn, onClose }) {
  const [username, setUsername] = useState('admin'), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [code, setCode] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault(); setError('');
    if (setupRequired && password !== confirmation) { setError('两次输入的密码不一致'); return; }
    setBusy(true);
    try { await api.authRequest(setupRequired ? 'setup' : 'login', { username, password, ...(setupRequired ? { code } : {}) }); setPassword(''); setConfirmation(''); await onLoggedIn(); }
    catch (problem) { setError(problem instanceof TypeError ? '无法连接登录服务，请稍后重试' : problem.message); }
    finally { setBusy(false); }
  };
  return <section className="glass-card admin-login"><h1>{setupRequired ? '设置管理员账号' : '管理员登录'}</h1><p className="muted">登录后可管理记录、录入信息和查看训练计划。访客只能查看公开成绩和影像。</p><Message error>{error}</Message><form onSubmit={submit}>
    <label className="form-group">管理员账号<input className="apple-input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={32}/></label>
    <label className="form-group">{setupRequired ? '设置密码（至少12位）' : '密码'}<input className="apple-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={setupRequired ? 'new-password' : 'current-password'} required minLength={setupRequired ? 12 : undefined} maxLength={128}/></label>
    {setupRequired && <><label className="form-group">再次输入密码<input className="apple-input" type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="new-password" required/></label><label className="form-group">本机初始化码<input className="apple-input" value={code} onChange={e => setCode(e.target.value)} autoComplete="off" required/></label><p className="muted">初始化码位于本机的 data/admin-setup-code.txt，仅首次设置时使用，设置完成后自动删除。</p></>}
    <div className="actions"><button className="apple-btn apple-btn-primary" disabled={busy}>{busy ? '正在验证…' : setupRequired ? '创建账号并登录' : '登录管理平台'}</button><button type="button" disabled={busy} onClick={onClose}>返回公开成绩</button></div>
  </form></section>;
}
