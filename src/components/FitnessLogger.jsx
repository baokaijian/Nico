import React, { useState } from 'react';
import { HeartPulse, Plus, Calendar, Trash2, Edit2, X, ShieldAlert } from 'lucide-react';

export default function FitnessLogger({ fitnessRecords, onAddFitness, onUpdateFitness, onDeleteFitness }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [standingJump, setStandingJump] = useState('135.0');
  const [plankSeconds, setPlankSeconds] = useState('60');
  const [sitAndReach, setSitAndReach] = useState('16.0');
  const [shoulderFlex, setShoulderFlex] = useState('70cm (肩关节脱手宽优秀)');
  const [ankleFlex, setAnkleFlex] = useState('极佳 (天生脚蹼特征，踝背屈超常)');
  const [shuttleRun, setShuttleRun] = useState('5.9');
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartEdit = (f) => {
    setEditingId(f.id);
    setDate(f.date);
    setStandingJump(f.standingJump !== null && f.standingJump !== undefined ? f.standingJump.toString() : '');
    setPlankSeconds(f.plankSeconds !== null && f.plankSeconds !== undefined ? f.plankSeconds.toString() : '');
    setSitAndReach(f.sitAndReach !== null && f.sitAndReach !== undefined ? f.sitAndReach.toString() : '');
    setShoulderFlex(f.shoulderFlex || '');
    setAnkleFlex(f.ankleFlex || '极佳 (天生脚蹼特征)');
    setShuttleRun(f.shuttleRun !== null && f.shuttleRun !== undefined ? f.shuttleRun.toString() : '');
    setNotes(f.notes || '');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setStandingJump('135.0');
    setPlankSeconds('60');
    setSitAndReach('16.0');
    setShoulderFlex('70cm (肩关节脱手宽优秀)');
    setAnkleFlex('极佳 (天生脚蹼特征，踝背屈超常)');
    setShuttleRun('5.9');
    setNotes('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      setError('请选择测试日期。');
      return;
    }

    setError('');
    setLoading(true);

    const recordData = {
      date,
      standingJump: standingJump ? parseFloat(standingJump) : null,
      plankSeconds: plankSeconds ? parseInt(plankSeconds, 10) : null,
      sitAndReach: sitAndReach ? parseFloat(sitAndReach) : null,
      shoulderFlex,
      ankleFlex,
      shuttleRun: shuttleRun ? parseFloat(shuttleRun) : null,
      notes
    };

    try {
      if (editingId) {
        await onUpdateFitness(editingId, recordData);
        setEditingId(null);
      } else {
        await onAddFitness(recordData);
      }
      handleCancelEdit();
    } catch {
      setError(editingId ? '修改体能记录失败。' : '保存体能记录失败。');
    } finally {
      setLoading(false);
    }
  };

  const sortedFitness = [...(fitnessRecords || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      {/* Alert Banner for Children's Sensitive Period */}
      <div className="glass-card mb-lg" style={{ 
        background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.08) 0%, rgba(255, 59, 48, 0.05) 100%)',
        border: '1px solid rgba(255, 149, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <ShieldAlert size={22} color="#ff9500" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-color)', margin: '0 0 4px 0' }}>
              6-7 岁少儿幼体发育敏感期体能指引
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6, margin: 0 }}>
              大关体校重点监测：<strong>立定跳远</strong>（预测起跳与转身蹬壁瞬间爆发力）、<strong>平板支撑</strong>（打造躯干抗伸展稳定性）、<strong>肩踝关节柔韧度</strong>（高肘与鞭水推进核心）。严禁器械深蹲负重！
            </p>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Entry Form */}
        <div className="glass-card">
          <h3 className="mb-md flex-gap-sm">
            <Plus size={20} style={{ color: editingId ? '#af52de' : '#ff9500' }} />
            {editingId ? '修改体能与柔韧记录' : '录入体能与柔韧评估测试'}
          </h3>

          {error && (
            <div style={{ color: 'rgb(255, 59, 48)', padding: '12px', background: 'rgba(255, 59, 48, 0.08)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">测试/打卡日期</label>
              <input 
                type="date" 
                className="apple-input" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
              />
            </div>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">立定跳远 (cm)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  placeholder="例如 135" 
                  className="apple-input" 
                  value={standingJump} 
                  onChange={(e) => setStandingJump(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">核心平板支撑 (秒)</label>
                <input 
                  type="number" 
                  step="1" 
                  placeholder="例如 60" 
                  className="apple-input" 
                  value={plankSeconds} 
                  onChange={(e) => setPlankSeconds(e.target.value)} 
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">坐位体前屈 (cm)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  placeholder="例如 16.0" 
                  className="apple-input" 
                  value={sitAndReach} 
                  onChange={(e) => setSitAndReach(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">30米陆上冲刺跑 (秒)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  placeholder="例如 5.9" 
                  className="apple-input" 
                  value={shuttleRun} 
                  onChange={(e) => setShuttleRun(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">肩关节柔韧度 (脱手宽 / 评级)</label>
              <input 
                type="text" 
                placeholder="例如：70cm (脱手宽及格线优秀)" 
                className="apple-input" 
                value={shoulderFlex} 
                onChange={(e) => setShoulderFlex(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">踝关节下压与背屈评级</label>
              <select 
                className="apple-select" 
                value={ankleFlex} 
                onChange={(e) => setAnkleFlex(e.target.value)}
              >
                <option value="极佳 (天生脚蹼特征，踝背屈超常)">极佳 (天生脚蹼特征，踝背屈超常)</option>
                <option value="优秀 (跪坐脚背完全贴地)">优秀 (跪坐脚背完全贴地)</option>
                <option value="良好 (打腿鞭状动作自然)">良好 (打腿鞭状动作自然)</option>
                <option value="一般 (需加强每日压脚背拉伸)">一般 (需加强每日压脚背拉伸)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">体能测试备注与拉伸重点</label>
              <textarea 
                placeholder="例如：下肢弹跳反应敏捷，肩部压肩到位，每天睡前压脚背15分钟..." 
                className="apple-textarea" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
              />
            </div>

            <button 
              type="submit" 
              className="apple-btn apple-btn-primary mt-sm" 
              style={{ width: '100%', background: editingId ? '#af52de' : '#ff9500' }}
              disabled={loading}
            >
              {loading ? '正在保存...' : editingId ? '保存修改' : '保存体能测试'}
            </button>

            {editingId && (
              <button 
                type="button" 
                className="apple-btn apple-btn-secondary mt-xs" 
                style={{ width: '100%', display: 'flex', gap: '4px', marginTop: '8px' }}
                onClick={handleCancelEdit}
              >
                <X size={15} />
                取消修改
              </button>
            )}
          </form>
        </div>

        {/* History Table */}
        <div className="glass-card">
          <h3 className="mb-md flex-gap-sm">
            <HeartPulse size={20} style={{ color: '#ff9500' }} />
            体能与柔韧测评档案
          </h3>

          {sortedFitness.length > 0 ? (
            <div className="history-table-container" style={{ maxHeight: '560px', overflowY: 'auto' }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>测试日期</th>
                    <th>立定跳远/30m</th>
                    <th>平板支撑/体前屈</th>
                    <th>肩踝柔韧特质</th>
                    <th style={{ textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFitness.map((f) => (
                    <tr key={f.id} style={{ background: editingId === f.id ? 'rgba(175, 82, 222, 0.05)' : '' }}>
                      <td>
                        <div className="flex-gap-sm" style={{ fontWeight: 600 }}>
                          <Calendar size={13} className="text-secondary" />
                          {f.date}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>跳远: {f.standingJump ? `${f.standingJump} cm` : '--'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                          冲刺: {f.shuttleRun ? `${f.shuttleRun} s` : '--'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>核心: {f.plankSeconds ? `${f.plankSeconds} 秒` : '--'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--secondary-color)' }}>
                          前屈: {f.sitAndReach ? `${f.sitAndReach} cm` : '--'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-color)' }}>
                          {f.shoulderFlex?.slice(0, 10)}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#34c759' }}>
                          {f.ankleFlex?.slice(0, 12)}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleStartEdit(f)} 
                            className="apple-btn apple-btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '10px', color: '#af52de' }}
                            title="修改"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => onDeleteFitness(f.id)} 
                            className="apple-btn apple-btn-danger"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '10px' }}
                            title="删除"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 'var(--space-xl) 0', textAlign: 'center', color: 'var(--secondary-color)', fontSize: '0.95rem' }}>
              暂无体能测评记录，请在左侧表单中录入。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
