import { useState } from 'react';
import { COACH_SCOPES, COACH_SCOPE_LABELS, athletesList } from '../../shared/athletes-coaches.mjs';
import { Message, Empty } from './ui';

export default function CoachGrants({ data, api, reload, role }) {
  const athletes = athletesList(data);
  const [athleteId, setAthleteId] = useState(() => data.activeAthleteId || athletes[0]?.id || 'nico');
  const [scopes, setScopes] = useState([...COACH_SCOPES]);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (role !== 'owner') return <Message>教练授权管理仅限家长管理员操作。</Message>;

  const toggleScope = scope => {
    setScopes(current => current.includes(scope) ? current.filter(s => s !== scope) : [...current, scope]);
  };

  const createInvite = async event => {
    event.preventDefault();
    if (!scopes.length) {
      setError('请至少勾选一项授权范围');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await api.request('/api/coach-grants/invite', {
        method: 'POST',
        body: { athleteId, scopes },
      });
      setInviteInfo(res);
      setNotice('已生成 24 小时有效的一次性教练邀请码，请复制发送给教练。');
      await reload();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmGrant = async grant => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.request(`/api/coach-grants/${encodeURIComponent(grant.id)}/confirm`, {
        method: 'POST',
        body: { athleteId: grant.athleteId, scopes: grant.scopes },
      });
      setNotice(`已确认教练 ${grant.coachUsername || grant.coachAccountId} 的协作授权，立即生效。`);
      await reload();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  const revokeGrant = async grant => {
    if (!window.confirm(`确认立即撤销该教练授权（${grant.coachUsername || grant.id}）？撤销后该教练将无法继续读写该运动员数据，已录入的历史记录与教练点评原话仍保留。`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.request(`/api/coach-grants/${encodeURIComponent(grant.id)}/revoke`, {
        method: 'POST',
        body: {},
      });
      setNotice('已撤销该教练授权，权限立即终止。');
      await reload();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  const grants = [...(data.coachGrants || [])].reverse();
  const athleteName = id => athletes.find(a => a.id === id)?.displayName || id;

  return (
    <div className="stack fade-in">
      <header>
        <h1>教练协作与授权管理</h1>
        <p className="muted">
          生成 24 小时一次性邀请码供教练注册绑定；教练完成注册后处于“待确认”状态，须由家长二次确认授权范围后才生效。家长可随时一键撤销授权。
        </p>
      </header>
      <Message error>{error}</Message>
      <Message>{notice}</Message>

      <section className="glass-card">
        <h2>生成教练一次性邀请码</h2>
        <form onSubmit={createInvite} className="stack">
          <div className="form-grid">
            <label className="form-group">
              授权绑定运动员
              <select className="apple-input" value={athleteId} onChange={e => setAthleteId(e.target.value)}>
                {athletes.map(a => (
                  <option key={a.id} value={a.id}>{a.displayName}（{a.id}）</option>
                ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend>允许教练执行的权限范围（最小权限原则）</legend>
            {COACH_SCOPES.map(scope => (
              <label className="check-row" key={scope}>
                <input
                  type="checkbox"
                  checked={scopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                />
                {COACH_SCOPE_LABELS[scope]}（<code>{scope}</code>）
              </label>
            ))}
          </fieldset>
          <div className="actions">
            <button disabled={busy} className="apple-btn apple-btn-primary">
              {busy ? '正在生成…' : '生成 24 小时一次性邀请码'}
            </button>
          </div>
        </form>
        {inviteInfo?.inviteToken && (
          <div className="glass-card" style={{ marginTop: '12px' }}>
            <h3>一次性邀请码（仅本次显示明文，服务端仅存 SHA-256 哈希）</h3>
            <p>
              <strong>邀请码：</strong>
              <code style={{ userSelect: 'all', padding: '4px 8px', fontSize: '1.05em' }}>{inviteInfo.inviteToken}</code>
            </p>
            <p className="muted">
              绑定运动员：{athleteName(inviteInfo.grant?.athleteId)} · 截止有效期：{inviteInfo.expiresAt} · 教练在登录弹窗选择“教练邀请码注册”即可完成绑定，之后请在此页面点击“确认生效”。
            </p>
          </div>
        )}
      </section>

      <section className="glass-card">
        <h2>授权列表</h2>
        {!grants.length ? (
          <Empty>尚无教练协作授权记录。</Empty>
        ) : (
          <div className="record-list">
            {grants.map(grant => (
              <article className="glass-card" key={grant.id}>
                <div className="flex-between">
                  <h3>
                    {athleteName(grant.athleteId)} · 教练：{grant.coachUsername || '待教练使用邀请码注册'} · 状态：{grant.status}
                  </h3>
                  <div className="actions">
                    {grant.status === '待确认' && (
                      <button
                        type="button"
                        disabled={busy}
                        className="apple-btn apple-btn-primary"
                        onClick={() => confirmGrant(grant)}
                      >
                        确认授权生效
                      </button>
                    )}
                    {grant.status !== '已撤销' && (
                      <button
                        type="button"
                        disabled={busy}
                        className="apple-btn apple-btn-secondary"
                        onClick={() => revokeGrant(grant)}
                      >
                        立即撤销授权
                      </button>
                    )}
                  </div>
                </div>
                <p>
                  授权范围：{(grant.scopes || []).map(s => COACH_SCOPE_LABELS[s] || s).join('、') || '无'}
                </p>
                <p className="muted">
                  授权ID：{grant.id} · 创建时间：{grant.createdAt}
                  {grant.expiresAt ? ` · 邀请码到期：${grant.expiresAt}` : ''}
                  {grant.acceptedAt ? ` · 注册绑定：${grant.acceptedAt}` : ''}
                  {grant.grantedAt ? ` · 确认生效：${grant.grantedAt}（${grant.grantedBy}）` : ''}
                  {grant.revokedAt ? ` · 已撤销：${grant.revokedAt}（${grant.revokedBy}）` : ''}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {(data.auditLog || []).length > 0 && (
        <section className="glass-card">
          <h2>最近协作与权限审计日志</h2>
          <div className="record-list">
            {[...(data.auditLog || [])].slice(-10).reverse().map(entry => (
              <p key={entry.id} className="muted">
                {entry.at} · <code>{entry.action}</code> · 操作人：{entry.actor}（{entry.role}）
                {entry.athleteId ? ` · 运动员：${athleteName(entry.athleteId)}` : ''}
                {entry.detail ? ` · ${entry.detail}` : ''}
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
