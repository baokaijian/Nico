import { useEffect, useRef, useState } from 'react';
import { Message } from './ui';
export default function LoginPanel({ api, setupRequired, onLoggedIn, onClose }) {
  const [mode, setMode] = useState('login'); // 'login' | 'coach-register'
  const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [code, setCode] = useState(''), [inviteToken, setInviteToken] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const firstInput = useRef(null);
  useEffect(() => { firstInput.current?.focus(); }, [mode]);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const isCoachRegister = !setupRequired && mode === 'coach-register';
  const submit = async event => {
    event.preventDefault(); setError(''); setNotice('');
    if ((setupRequired || isCoachRegister) && password !== confirmation) { setError('两次输入的密码不一致'); return; }
    setBusy(true);
    try {
      if (isCoachRegister) {
        const res = await api.authRequest('coach-register', { inviteToken, username, password });
        setPassword(''); setConfirmation(''); setInviteToken('');
        setNotice(res?.message || '教练账号已创建，请等待家长在“管理设置 → 教练授权”中确认生效后登录。');
        setMode('login');
        return;
      }
      await api.authRequest(setupRequired ? 'setup' : 'login', { username, password, ...(setupRequired ? { code } : {}) });
      setPassword(''); setConfirmation(''); setCode('');
      await onLoggedIn();
    }
    catch (problem) { setError(problem instanceof TypeError ? '无法连接登录服务，请稍后重试' : problem.message); }
    finally { setBusy(false); }
  };
  return <>
    <div className="pop-backdrop" onClick={onClose} aria-hidden="true"/>
    <div className="login-pop" role="dialog" aria-modal="true" aria-labelledby="login-pop-title">
      <div className="login-pop-head" id="login-pop-title">{setupRequired ? '首次登录需设置管理员账号' : isCoachRegister ? '教练邀请码注册绑定' : '登录管理平台'}</div>
      {!setupRequired && (
        <div className="actions" style={{ padding: '0 20px', marginTop: '8px' }}>
          <button type="button" className={`apple-btn ${mode === 'login' ? 'apple-btn-primary' : 'apple-btn-secondary'}`} onClick={() => { setMode('login'); setError(''); }}>账号登录</button>
          <button type="button" className={`apple-btn ${mode === 'coach-register' ? 'apple-btn-primary' : 'apple-btn-secondary'}`} onClick={() => { setMode('coach-register'); setError(''); }}>教练邀请码注册</button>
        </div>
      )}
      <form className="login-pop-body" onSubmit={submit}>
        <Message error>{error}</Message>
        <Message>{notice}</Message>
        {isCoachRegister && (
          <label className="form-group">24小时一次性邀请码<input ref={firstInput} className="apple-input" value={inviteToken} onChange={e => setInviteToken(e.target.value)} autoComplete="off" required placeholder="粘贴家长生成的邀请码"/></label>
        )}
        <label className="form-group">{isCoachRegister ? '设置教练账号（3-32位）' : '账号（家长或已授权教练）'}<input ref={!isCoachRegister ? firstInput : undefined} className="apple-input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={32}/></label>
        <label className="form-group">{setupRequired || isCoachRegister ? '设置密码（至少12位）' : '密码'}<input className="apple-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={setupRequired || isCoachRegister ? 'new-password' : 'current-password'} required minLength={setupRequired || isCoachRegister ? 12 : undefined} maxLength={128}/></label>
        {(setupRequired || isCoachRegister) && <>
          <label className="form-group">再次输入密码<input className="apple-input" type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="new-password" required/></label>
        </>}
        {setupRequired && <>
          <label className="form-group">本机初始化码<input className="apple-input" value={code} onChange={e => setCode(e.target.value)} autoComplete="off" required/></label>
          <p className="login-pop-hint">初始化码位于本机的 data/admin-setup-code.txt，仅首次设置时使用，设置完成后自动删除。</p>
        </>}
        <button className="apple-btn apple-btn-primary" disabled={busy}>{busy ? '正在验证…' : setupRequired ? '创建账号并登录' : isCoachRegister ? '提交教练注册并等待家长确认' : '登录'}</button>
        <p className="login-pop-hint">{isCoachRegister ? '使用家长生成的 24 小时一次性邀请码创建教练协作账号；提交后需家长在“教练授权”页二次确认授权范围后方可生效。' : '不登录可查看公开概览、成绩和授权影像；完整档案、训练计划和录入需登录。当前标签页在会话有效期内保持登录，刷新无需重复输入密码；登录后可在账号菜单切换查看模式。按 Esc 可关闭。'}</p>
      </form>
    </div>
  </>;
}
