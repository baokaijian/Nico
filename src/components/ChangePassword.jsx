import { useState } from 'react';
import { Message } from './ui';
export default function ChangePassword({ api, onChanged }) {
  const [currentPassword, setCurrent] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  return <section className="glass-card admin-login"><h1>设置你的管理员密码</h1><p>首次登录需替换临时密码，完成后才能访问私有档案。</p><Message error>{error}</Message><form onSubmit={async event => { event.preventDefault(); setError(''); if (password !== confirmation) { setError('两次新密码不一致'); return; } setBusy(true); try { await api.authRequest('password', { currentPassword, password }); setCurrent(''); setPassword(''); setConfirmation(''); await onChanged(); } catch (problem) { setError(problem.message); } finally { setBusy(false); } }}>
    <label className="form-group">临时密码<input className="apple-input" type="password" required autoComplete="current-password" value={currentPassword} onChange={e => setCurrent(e.target.value)}/></label>
    <label className="form-group">新密码（至少12位）<input className="apple-input" type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}/></label>
    <label className="form-group">再次输入新密码<input className="apple-input" type="password" required autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)}/></label>
    <button disabled={busy} className="apple-btn apple-btn-primary">{busy ? '正在设置…' : '保存密码并进入管理平台'}</button>
  </form></section>;
}
