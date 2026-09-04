import React, { useState } from 'react';
import { Waves, Plus, Calendar, Trash2, Edit2, X, Activity, Award } from 'lucide-react';

export default function TrainingLogger({ trainings, onAddTraining, onUpdateTraining, onDeleteTraining }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState('下午主训');
  const [trainingType, setTrainingType] = useState('技术水感课');
  const [totalMeters, setTotalMeters] = useState('1600');
  const [kickMeters, setKickMeters] = useState('500');
  const [intensity, setIntensity] = useState('中强度 (A2有氧基础)');
  const [focusSkills, setFocusSkills] = useState('');
  const [rpe, setRpe] = useState('7');
  const [coachNotes, setCoachNotes] = useState('');
  const [completionRate, setCompletionRate] = useState('100');

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Table filter state
  const [filterType, setFilterType] = useState('All');

  const handleStartEdit = (t) => {
    setEditingId(t.id);
    setDate(t.date);
    setSession(t.session || '下午主训');
    setTrainingType(t.trainingType || '技术水感课');
    setTotalMeters(t.totalMeters ? t.totalMeters.toString() : '');
    setKickMeters(t.kickMeters ? t.kickMeters.toString() : '');
    setIntensity(t.intensity || '中强度 (A2有氧基础)');
    setFocusSkills(t.focusSkills || '');
    setRpe(t.rpe ? t.rpe.toString() : '7');
    setCoachNotes(t.coachNotes || '');
    setCompletionRate(t.completionRate ? t.completionRate.toString() : '100');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setSession('下午主训');
    setTrainingType('技术水感课');
    setTotalMeters('1600');
    setKickMeters('500');
    setIntensity('中强度 (A2有氧基础)');
    setFocusSkills('');
    setRpe('7');
    setCoachNotes('');
    setCompletionRate('100');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      setError('请选择训练日期。');
      return;
    }

    setError('');
    setLoading(true);

    const recordData = {
      date,
      session,
      trainingType,
      totalMeters: totalMeters ? parseInt(totalMeters, 10) : 0,
      kickMeters: kickMeters ? parseInt(kickMeters, 10) : 0,
      intensity,
      focusSkills,
      rpe: rpe ? parseInt(rpe, 10) : 7,
      coachNotes,
      completionRate: completionRate ? parseInt(completionRate, 10) : 100
    };

    try {
      if (editingId) {
        await onUpdateTraining(editingId, recordData);
        setEditingId(null);
      } else {
        await onAddTraining(recordData);
      }
      handleCancelEdit();
    } catch {
      setError(editingId ? '修改训练记录失败。' : '保存训练记录失败。');
    } finally {
      setLoading(false);
    }
  };

  // Aggregates
  const totalMetersSum = trainings ? trainings.reduce((acc, c) => acc + (c.totalMeters || 0), 0) : 0;
  const kickMetersSum = trainings ? trainings.reduce((acc, c) => acc + (c.kickMeters || 0), 0) : 0;
  const avgRpe = trainings && trainings.length > 0 
    ? (trainings.reduce((acc, c) => acc + (c.rpe || 7), 0) / trainings.length).toFixed(1) 
    : '0.0';

  const filteredTrainings = (trainings || []).filter(t => {
    if (filterType === 'All') return true;
    return t.trainingType === filterType;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const trainingTypes = ['技术水感课', '打腿专项课', '有氧基础包', '四式混合课', '冲刺速度耐力', '阶段测验'];
  const intensityLevels = [
    '低强度 (A1恢复/技术)', 
    '中强度 (A2有氧基础)', 
    '中高强度 (EN1混氧)', 
    '高强度 (EN2乳酸耐力)', 
    '极限冲刺 (SP速度)'
  ];

  return (
    <div>
      {/* Top Aggregates Strip */}
      <div className="grid-3 mb-lg">
        <div className="glass-card metrics-card">
          <div className="flex-between">
            <span className="metrics-title">大关三线水上总里程</span>
            <Waves size={18} style={{ color: 'var(--accent-color)' }} />
          </div>
          <div className="metrics-value">
            {totalMetersSum.toLocaleString()}
            <span className="metrics-unit">米</span>
          </div>
          <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
            累计完成 {trainings.length} 次专业走训水上课
          </div>
        </div>

        <div className="glass-card metrics-card">
          <div className="flex-between">
            <span className="metrics-title">纯打腿专项累计量</span>
            <Activity size={18} style={{ color: '#34c759' }} />
          </div>
          <div className="metrics-value">
            {kickMetersSum.toLocaleString()}
            <span className="metrics-unit">米</span>
          </div>
          <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
            打腿占总训练比重: {totalMetersSum > 0 ? ((kickMetersSum / totalMetersSum) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="glass-card metrics-card">
          <div className="flex-between">
            <span className="metrics-title">平均训练疲劳指数 (RPE)</span>
            <Award size={18} style={{ color: '#ff9500' }} />
          </div>
          <div className="metrics-value">
            {avgRpe}
            <span className="metrics-unit">/10 分</span>
          </div>
          <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
            主观负荷适中，心肺适应与恢复良好
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Entry Form */}
        <div className="glass-card">
          <h3 className="mb-md flex-gap-sm">
            <Plus size={20} style={{ color: editingId ? '#af52de' : 'var(--accent-color)' }} />
            {editingId ? '修改水上训练日志' : '记录今日水上训练课'}
          </h3>

          {error && (
            <div style={{ color: 'rgb(255, 59, 48)', padding: '12px', background: 'rgba(255, 59, 48, 0.08)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">训练日期</label>
                <input 
                  type="date" 
                  className="apple-input" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">课次时段</label>
                <select className="apple-select" value={session} onChange={(e) => setSession(e.target.value)}>
                  <option value="下午主训">下午主训 (16:30-18:15)</option>
                  <option value="上午集训">上午集训 (09:00-11:00)</option>
                  <option value="早训">早晨早训</option>
                  <option value="周末大包课">周末大包课</option>
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">训练类型</label>
                <select className="apple-select" value={trainingType} onChange={(e) => setTrainingType(e.target.value)}>
                  {trainingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">强度区间</label>
                <select className="apple-select" value={intensity} onChange={(e) => setIntensity(e.target.value)}>
                  {intensityLevels.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">总泳程 (米)</label>
                <input 
                  type="number" 
                  step="50" 
                  placeholder="例如 1600" 
                  className="apple-input" 
                  value={totalMeters} 
                  onChange={(e) => setTotalMeters(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">其中打腿量 (米)</label>
                <input 
                  type="number" 
                  step="50" 
                  placeholder="例如 500" 
                  className="apple-input" 
                  value={kickMeters} 
                  onChange={(e) => setKickMeters(e.target.value)} 
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">主观疲劳 RPE (1-10分)</label>
                <select className="apple-select" value={rpe} onChange={(e) => setRpe(e.target.value)}>
                  <option value="5">5分 - 轻松游 (呼吸顺畅)</option>
                  <option value="6">6分 - 轻度有氧 (轻微气喘)</option>
                  <option value="7">7分 - 中度有氧 (心率上升但能坚持)</option>
                  <option value="8">8分 - 较吃力 (后程肌肉发酸)</option>
                  <option value="9">9分 - 极吃力 (全力以赴极度疲劳)</option>
                  <option value="10">10分 - 极限竭尽 (比赛冲刺状态)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">计划完成度 (%)</label>
                <input 
                  type="number" 
                  min="50" 
                  max="100" 
                  className="apple-input" 
                  value={completionRate} 
                  onChange={(e) => setCompletionRate(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">攻坚技能重点</label>
              <input 
                type="text" 
                placeholder="例如：高肘抱水深度、转身海豚打腿5米线、划频与划幅平衡..." 
                className="apple-input" 
                value={focusSkills} 
                onChange={(e) => setFocusSkills(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">大关教练现场点评与指导</label>
              <textarea 
                placeholder="例如：今天划水抱水厚度有长进，继续强化后程打腿频次，出水不要抬头..." 
                className="apple-textarea" 
                value={coachNotes} 
                onChange={(e) => setCoachNotes(e.target.value)} 
              />
            </div>

            <button 
              type="submit" 
              className="apple-btn apple-btn-primary mt-sm" 
              style={{ width: '100%', background: editingId ? '#af52de' : 'var(--accent-color)' }}
              disabled={loading}
            >
              {loading ? '正在保存...' : editingId ? '保存修改' : '保存训练日志'}
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

        {/* History Logs */}
        <div className="glass-card">
          <div className="flex-between mb-md" style={{ flexWrap: 'wrap', gap: '8px' }}>
            <h3 className="flex-gap-sm" style={{ margin: 0 }}>
              <Waves size={20} style={{ color: 'var(--accent-color)' }} />
              水上训练课表历史
            </h3>

            {/* Filter */}
            <select 
              className="apple-select" 
              style={{ padding: '6px 12px', width: 'auto', borderRadius: '12px', fontSize: '0.85rem' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">全部训练类型</option>
              {trainingTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {filteredTrainings.length > 0 ? (
            <div className="history-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>日期/时段</th>
                    <th>类型/强度</th>
                    <th>泳程/打腿</th>
                    <th>RPE/重点</th>
                    <th style={{ textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainings.map((t) => (
                    <tr key={t.id} style={{ background: editingId === t.id ? 'rgba(175, 82, 222, 0.05)' : '' }}>
                      <td>
                        <div className="flex-gap-sm" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                          <Calendar size={13} className="text-secondary" />
                          {t.date}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--secondary-color)', marginTop: '2px' }}>
                          {t.session}
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '0.78rem', 
                          background: 'rgba(0, 113, 227, 0.1)', 
                          color: 'var(--accent-color)', 
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          fontWeight: 600 
                        }}>
                          {t.trainingType}
                        </span>
                        <div style={{ fontSize: '0.8rem', color: 'var(--secondary-color)', marginTop: '4px' }}>
                          {t.intensity?.split(' ')[0]}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{t.totalMeters} m</div>
                        <div style={{ fontSize: '0.8rem', color: '#34c759' }}>打腿: {t.kickMeters} m</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>RPE: {t.rpe}/10</div>
                        {t.coachNotes && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--secondary-color)', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.coachNotes}>
                            {t.coachNotes}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleStartEdit(t)} 
                            className="apple-btn apple-btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '10px', color: '#af52de' }}
                            title="修改"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => onDeleteTraining(t.id)} 
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
              暂无匹配的水上训练记录。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
