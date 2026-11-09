import { downloadJSON } from '../services/files';
import { useEffect, useState } from 'react';
import { WOMEN_50, STANDARD_SOURCE, STANDARD_VERSION, publicSnapshot } from '../../shared/domain.mjs';
import { ATHLETE_SEXES, ATHLETE_STROKES, ATHLETE_POOLS, athletesList, validateAthleteInput } from '../../shared/athletes-coaches.mjs';
import { Field, Message } from './ui';
import GrowthGoals from './GrowthGoals';

const blankAthleteForm = () => ({
  id: '',
  displayName: '',
  sex: '',
  birthDate: '',
  primaryStroke: '',
  homePoolLength: '',
  heightCm: '',
  weightKg: '',
});

export default function Profile({ data, api, onSaved, reload, readOnly, role, view = 'all', onSwitchAthlete }) {
  const [profile, setProfile] = useState(data.profile), [publishing, setPublishing] = useState(data.publishing), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const owner = role === 'owner';
  const [bases, setBases] = useState(() => ({ profile: api.getRevision(), publishing: api.getRevision() })), [conflict, setConflict] = useState('');
  const [athleteForm, setAthleteForm] = useState(blankAthleteForm);
  const [editingAthleteId, setEditingAthleteId] = useState('');

  useEffect(() => {
    setProfile(data.profile);
  }, [data.profile]);

  const activeAthletes = athletesList(data, { includeDeleted: false });
  const deletedAthletes = athletesList(data, { includeDeleted: true }).filter(a => a.deletedAt);

  const save = async (key, body, overrideRevision) => {
    setBusy(true); setError('');
    try {
      const expectedRevision = overrideRevision ?? bases[key];
      const saved = await api.request(`/api/${key}`, { method: 'PUT', body, expectedRevision });
      onSaved(key, saved);
      setBases(current => ({ ...current, [key]: api.getRevision(), ...Object.fromEntries(Object.entries(current).filter(([, value]) => value === expectedRevision).map(([name]) => [name, api.getRevision()])) }));
      setConflict('');
      setNotice('服务端保存成功');
    } catch (problem) {
      setError(problem.message);
      if (problem.status === 409) setConflict(key);
    } finally { setBusy(false); }
  };

  const editAthlete = athlete => {
    setEditingAthleteId(athlete.id);
    setAthleteForm({
      id: athlete.id,
      displayName: athlete.displayName || athlete.name || '',
      sex: athlete.sex || '',
      birthDate: athlete.birthDate || '',
      primaryStroke: athlete.primaryStroke || '',
      homePoolLength: athlete.homePoolLength || '',
      heightCm: athlete.heightCm ?? '',
      weightKg: athlete.weightKg ?? '',
    });
    setError('');
  };

  const submitAthlete = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const cleaned = validateAthleteInput(athleteForm);
      if (editingAthleteId) {
        await api.request(`/api/athletes/${encodeURIComponent(editingAthleteId)}`, { method: 'PUT', body: cleaned });
        setNotice(`已更新运动员档案：${cleaned.displayName}`);
      } else {
        const created = await api.request('/api/athletes', { method: 'POST', body: cleaned });
        setNotice(`已新增运动员档案：${created.displayName}`);
        onSwitchAthlete?.(created.id);
      }
      setEditingAthleteId('');
      setAthleteForm(blankAthleteForm());
      await reload();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  const removeAthlete = async athlete => {
    if (!window.confirm(`将运动员“${athlete.displayName}”移入回收站？关联子记录会一并逻辑归档保留，可随时恢复。`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api.request(`/api/athletes/${encodeURIComponent(athlete.id)}`, { method: 'DELETE' });
      setNotice(`已将运动员“${athlete.displayName}”移入回收站。`);
      if (data.activeAthleteId === athlete.id) {
        const next = activeAthletes.find(a => a.id !== athlete.id);
        if (next) onSwitchAthlete?.(next.id);
      }
      await reload();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  const restoreAthleteItem = async athlete => {
    setBusy(true); setError(''); setNotice('');
    try {
      await api.request(`/api/athletes/${encodeURIComponent(athlete.id)}/restore`, { method: 'POST', body: {} });
      setNotice(`已恢复运动员“${athlete.displayName}”及其关联记录。`);
      await reload();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key, id) => setPublishing(current => ({ ...current, [key]: current[key].includes(id) ? current[key].filter(x => x !== id) : [...current[key], id], confirmedBy: '', confirmedAt: '' }));
  const backup = async () => { try { downloadJSON('Nico-完整私有备份.json', await api.request('/api/backup')); } catch (problem) { setError(problem.message); } };
  const restore = async e => { const file = e.target.files[0]; if (!file) return; try { const body = JSON.parse(await file.text()); if (!window.confirm('用此备份恢复记录库？当前版本会自动备份，便于回退。')) return; await api.request('/api/restore', { method: 'POST', body }); await reload(); setNotice('已恢复；重新进入档案页查看最新字段'); } catch (problem) { setError(problem.message); } finally { e.target.value = ''; } };
  return <div className="stack"><header><h1>{view === 'all' ? '档案与目标' : view === 'archive' ? '成长档案' : '管理设置'}</h1><p className="muted">基础数据来自实际录入。性别与生日尚未确认时不自动匹配等级或计算年龄。</p></header><Message error>{error}</Message><Message>{notice}</Message>{conflict && <Message>检测到版本冲突（409）：服务端已有更新版本。<div className="actions"><button type="button" onClick={async () => { await reload(); setBases(current => ({ ...current, [conflict]: api.getRevision() })); setConflict(''); setError(''); }}>查看最新</button><button type="button" onClick={() => { if (!window.confirm('确认用您当前填写的版本覆盖服务端最新内容？')) return; const targetKey = conflict; const body = targetKey === 'profile' ? profile : publishing; save(targetKey, body, api.getRevision()); }}>用我的版本覆盖</button></div></Message>}
    {['all', 'profile', 'archive'].includes(view) && <section className="glass-card"><h2>当前运动员基础档案</h2>{owner ? <form onSubmit={e => { e.preventDefault(); save('profile', profile); }}><div className="form-grid">{[{ key: 'name', label: '姓名 / 昵称', type: 'text', required: true }, { key: 'sex', label: '已确认的性别', type: 'select', options: ['女', '男', '其他'] }, { key: 'birthDate', label: '生日（可留空）', type: 'date' }].map(f => <Field key={f.key} field={f} value={profile[f.key]} onChange={v => setProfile(current => ({ ...current, [f.key]: v }))}/>)}</div><button disabled={busy} className="apple-btn apple-btn-primary">保存已确认档案</button></form> : <p>{data.profile.name} · 性别{data.profile.sex || '未确认'} · 生日{data.profile.birthDate || '未填写'}</p>}</section>}
    {owner && ['all', 'profile'].includes(view) && (
      <section className="glass-card">
        <h2>多运动员档案管理（完全隔离）</h2>
        <p className="muted">每位小运动员拥有独立数据空间（训练、成绩、PB、计划、测评、影像互不混入）。留空表示未填写（<code>null</code>），严禁填 0 代替缺失。</p>
        <div className="record-list" style={{ marginBottom: '12px' }}>
          {activeAthletes.map(a => (
            <article className="glass-card" key={a.id}>
              <div className="flex-between">
                <h3>{a.displayName}（ID: <code>{a.id}</code>）{(data.activeAthleteId || 'nico') === a.id ? ' · 当前选中' : ''}</h3>
                <div className="actions">
                  {(data.activeAthleteId || 'nico') !== a.id && onSwitchAthlete && (
                    <button type="button" className="apple-btn apple-btn-secondary" onClick={() => onSwitchAthlete(a.id)}>切换至此运动员</button>
                  )}
                  <button type="button" className="apple-btn apple-btn-secondary" onClick={() => editAthlete(a)}>编辑档案</button>
                  {activeAthletes.length > 1 && (
                    <button type="button" className="apple-btn apple-btn-secondary" onClick={() => removeAthlete(a)}>移入回收站</button>
                  )}
                </div>
              </div>
              <p className="muted">
                性别：{a.sex || '未确认'} · 生日：{a.birthDate || '未填写'} · 主项泳姿：{a.primaryStroke || '未设置'} · 常用池长：{a.homePoolLength || '未设置'} · 身高：{a.heightCm != null ? `${a.heightCm}cm` : '未填'} · 体重：{a.weightKg != null ? `${a.weightKg}kg` : '未填'}
              </p>
            </article>
          ))}
        </div>
        <details open={Boolean(editingAthleteId)}>
          <summary>{editingAthleteId ? `编辑运动员：${athleteForm.displayName || editingAthleteId}` : '新增运动员档案'}</summary>
          <form onSubmit={submitAthlete} className="stack" style={{ marginTop: '10px' }}>
            <div className="form-grid">
              <Field field={{ key: 'displayName', label: '姓名 / 昵称（1-20字，必填）', type: 'text', required: true }} value={athleteForm.displayName} onChange={v => setAthleteForm(c => ({ ...c, displayName: v }))}/>
              <Field field={{ key: 'sex', label: '性别（可选）', type: 'select', options: ATHLETE_SEXES }} value={athleteForm.sex} onChange={v => setAthleteForm(c => ({ ...c, sex: v }))}/>
              <Field field={{ key: 'birthDate', label: '出生日期（可选）', type: 'date' }} value={athleteForm.birthDate} onChange={v => setAthleteForm(c => ({ ...c, birthDate: v }))}/>
              <Field field={{ key: 'primaryStroke', label: '主项泳姿（可选）', type: 'select', options: ATHLETE_STROKES }} value={athleteForm.primaryStroke} onChange={v => setAthleteForm(c => ({ ...c, primaryStroke: v }))}/>
              <Field field={{ key: 'homePoolLength', label: '常用池长（可选）', type: 'select', options: ATHLETE_POOLS }} value={athleteForm.homePoolLength} onChange={v => setAthleteForm(c => ({ ...c, homePoolLength: v }))}/>
              <Field field={{ key: 'heightCm', label: '当前身高 cm（40-230，一位小数，可空）', type: 'number', step: 0.1 }} value={athleteForm.heightCm} onChange={v => setAthleteForm(c => ({ ...c, heightCm: v }))}/>
              <Field field={{ key: 'weightKg', label: '当前体重 kg（5-180，一位小数，可空）', type: 'number', step: 0.1 }} value={athleteForm.weightKg} onChange={v => setAthleteForm(c => ({ ...c, weightKg: v }))}/>
            </div>
            <div className="actions">
              <button disabled={busy} className="apple-btn apple-btn-primary">{editingAthleteId ? '保存运动员修改' : '创建运动员档案'}</button>
              {editingAthleteId && <button type="button" className="apple-btn apple-btn-secondary" onClick={() => { setEditingAthleteId(''); setAthleteForm(blankAthleteForm()); }}>取消编辑</button>}
            </div>
          </form>
        </details>
        {deletedAthletes.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <h3>已移入回收站的运动员档案</h3>
            {deletedAthletes.map(a => (
              <p key={a.id}>
                {a.displayName}（{a.id}） · 删除于 {a.deletedAt?.slice(0, 10)}
                <button type="button" onClick={() => restoreAthleteItem(a)}>恢复运动员及关联数据</button>
              </p>
            ))}
          </div>
        )}
      </section>
    )}
    {['all', 'archive'].includes(view) && <section className="glass-card"><h2>女子50米项目官方参考表</h2><p>版本：{STANDARD_VERSION}。此表不自动推断档案性别，也不表示训练计时取得证书。其他项目请查官方完整表。</p><div className="history-table-container"><table className="history-table"><thead><tr><th>泳姿</th><th>池长</th><th>二级</th><th>三级</th></tr></thead><tbody>{Object.entries(WOMEN_50).flatMap(([stroke, pools]) => Object.entries(pools).map(([pool, lines]) => <tr key={`${stroke}-${pool}`}><td>{stroke}</td><td>{pool}</td><td>{lines.二级.toFixed(2)}秒</td><td>{lines.三级?.toFixed(2) || '查官方表'}</td></tr>))}</tbody></table></div><p><a href={STANDARD_SOURCE} target="_blank" rel="noreferrer">打开体育总局完整标准与赛事条件</a></p></section>}
    {view === 'all' && <GrowthGoals data={data} api={api} onSaved={onSaved} readOnly={readOnly || !owner}/>}
    {owner && ['all', 'publishing'].includes(view) && <section className="glass-card"><h2>展示摘要（可选）</h2><p>勾选后生成一份精简摘要，用于独立展示；未勾选的记录不会进入摘要包。</p><form onSubmit={e => { e.preventDefault(); save('publishing', publishing); }}><fieldset><legend>摘要包含的成绩</legend>{data.swim.map(r => <label className="check-row" key={r.id}><input type="checkbox" checked={publishing.swimIds.includes(r.id)} onChange={() => toggle('swimIds', r.id)}/>{r.date} · {r.distance}{r.stroke} · {r.time} · {r.poolLength}池</label>)}</fieldset><fieldset><legend>摘要包含的影像</legend>{data.media.map(m => <label className="check-row" key={m.id}><input type="checkbox" checked={publishing.mediaIds.includes(m.id)} onChange={() => toggle('mediaIds', m.id)}/>{m.date} · {m.title}</label>)}</fieldset><div className="form-grid">{[{ key: 'story', label: '成长故事（自行核对内容）', type: 'textarea' }, { key: 'confirmedBy', label: '摘要发布人', type: 'text', required: true }, { key: 'confirmedAt', label: '摘要发布日期', type: 'date', required: true }].filter(f => !api.cloudMode || f.key !== 'story').map(f => <Field key={f.key} field={f} value={publishing[f.key]} onChange={v => setPublishing(current => ({ ...current, [f.key]: v, ...(f.key === 'story' ? { confirmedBy: '', confirmedAt: '' } : {}) }))}/>)}</div><div className="actions"><button disabled={busy} className="apple-btn apple-btn-primary">{api.cloudMode ? '保存并更新展示摘要' : '保存摘要范围'}</button><button type="button" onClick={() => downloadJSON('Nico-摘要预览.json', publicSnapshot(data, publishing))}>下载摘要预览</button></div><p className="muted">{api.cloudMode ? '保存后会更新云端公开摘要。未勾选的记录继续保持私有。' : '保存摘要范围不会自动发布网站。核对后生成本地摘要包，构建与发布流程只读取这个包。'}</p>{!api.cloudMode && <button type="button" onClick={async () => { try { const result = await api.request('/api/public-export', { method: 'POST' }); setNotice(result.message); } catch (problem) { setError(problem.message); } }}>用已保存范围生成本地展示摘要包</button>}</form></section>}
    {owner && ['all', 'backup'].includes(view) && <section className="glass-card"><h2>备份与恢复</h2><div className="actions"><button onClick={backup}>导出完整私有备份</button><label className="restore-label">从备份恢复<input type="file" accept="application/json" onChange={restore}/></label></div><p>删除只会移入回收站，原记录和影像保留，可随时恢复。恢复备份时，备份中缺少的较新记录也会保留在回收站。每次修改前自动备份旧版本。备份包含私有资料，请自行妥善保存。</p><h3>回收站</h3>{(data.trash || []).length ? data.trash.map(item => <p key={item.id}>{item.collection} · {item.record.date || item.record.title} · {item.record.id} {item.deletedAt && <span> · {item.deletedAt.slice(0, 10)}删除{item.deletedBy ? `（${item.deletedBy}）` : ''}</span>} <button onClick={async () => { try { await api.request(`/api/trash/${encodeURIComponent(item.id)}/restore`, { method: 'POST' }); await reload(); } catch (problem) { setError(problem.message); } }}>恢复记录</button></p>) : <p className="muted">回收站为空。</p>}</section>}
  </div>;
}
