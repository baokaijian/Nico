import React, { useState } from 'react';
import { Apple, Plus, Calendar, Trash2, Edit2, X, CheckSquare, Square } from 'lucide-react';

export default function NutritionLogger({ nutritionRecords, onAddNutrition, onUpdateNutrition, onDeleteNutrition }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [preMeal, setPreMeal] = useState('全麦吐司1片 + 香蕉半根 + 温开水150ml (课前1小时)');
  const [postMeal, setPostMeal] = useState('温纯牛奶250ml + 水煮土鸡蛋1个 + 蓝莓一把 (课后30分内)');
  const [waterMl, setWaterMl] = useState('1600');
  const [calciumTaken, setCalciumTaken] = useState(true);
  const [ironTaken, setIronTaken] = useState(true);
  const [zincTaken, setZincTaken] = useState(true);
  const [sleepHours, setSleepHours] = useState('9.8');
  const [morningPulse, setMorningPulse] = useState('71');
  const [recoveryScore, setRecoveryScore] = useState('5');
  const [notes, setNotes] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartEdit = (n) => {
    setEditingId(n.id);
    setDate(n.date);
    setPreMeal(n.preMeal || '');
    setPostMeal(n.postMeal || '');
    setWaterMl(n.waterMl ? n.waterMl.toString() : '1500');
    setCalciumTaken(Boolean(n.calciumTaken));
    setIronTaken(Boolean(n.ironTaken));
    setZincTaken(Boolean(n.zincTaken));
    setSleepHours(n.sleepHours ? n.sleepHours.toString() : '9.5');
    setMorningPulse(n.morningPulse ? n.morningPulse.toString() : '');
    setRecoveryScore(n.recoveryScore ? n.recoveryScore.toString() : '5');
    setNotes(n.notes || '');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setPreMeal('全麦吐司1片 + 香蕉半根 + 温开水150ml (课前1小时)');
    setPostMeal('温纯牛奶250ml + 水煮土鸡蛋1个 + 蓝莓一把 (课后30分内)');
    setWaterMl('1600');
    setCalciumTaken(true);
    setIronTaken(true);
    setZincTaken(true);
    setSleepHours('9.8');
    setMorningPulse('71');
    setRecoveryScore('5');
    setNotes('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      setError('请选择记录日期。');
      return;
    }

    setError('');
    setLoading(true);

    const recordData = {
      date,
      preMeal,
      postMeal,
      waterMl: waterMl ? parseInt(waterMl, 10) : 1500,
      calciumTaken,
      ironTaken,
      zincTaken,
      sleepHours: sleepHours ? parseFloat(sleepHours) : 9.5,
      morningPulse: morningPulse ? parseInt(morningPulse, 10) : null,
      recoveryScore: recoveryScore ? parseInt(recoveryScore, 10) : 5,
      notes
    };

    try {
      if (editingId) {
        await onUpdateNutrition(editingId, recordData);
        setEditingId(null);
      } else {
        await onAddNutrition(recordData);
      }
      handleCancelEdit();
    } catch {
      setError(editingId ? '修改营养记录失败。' : '保存营养记录失败。');
    } finally {
      setLoading(false);
    }
  };

  const sortedNutrition = [...(nutritionRecords || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      {/* Top Banner */}
      <div className="glass-card mb-lg" style={{ 
        background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.08) 0%, rgba(0, 113, 227, 0.05) 100%)',
        border: '1px solid rgba(52, 199, 89, 0.2)'
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <Apple size={22} color="#248a3d" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-color)', margin: '0 0 4px 0' }}>
              大关三线走训期：高代谢营养与夜间长高恢复法则
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--secondary-color)', lineHeight: 1.6, margin: 0 }}>
              课前慢碳充能防低血糖、课后30分钟高蛋白温牛奶+水煮蛋黄金修复、充足微量元素（钙D3、铁元素防溶血贫血）、21:15前上床享受 9.5+小时生长激素深睡。
            </p>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Entry Form */}
        <div className="glass-card">
          <h3 className="mb-md flex-gap-sm">
            <Plus size={20} style={{ color: editingId ? '#af52de' : '#248a3d' }} />
            {editingId ? '修改营养与恢复打卡' : '记录今日饮食营养与恢复'}
          </h3>

          {error && (
            <div style={{ color: 'rgb(255, 59, 48)', padding: '12px', background: 'rgba(255, 59, 48, 0.08)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid-2" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">打卡日期</label>
                <input 
                  type="date" 
                  className="apple-input" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">全天总饮水量 (ml)</label>
                <input 
                  type="number" 
                  step="50" 
                  placeholder="例如 1600" 
                  className="apple-input" 
                  value={waterMl} 
                  onChange={(e) => setWaterMl(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">课前 60 分钟加餐充能</label>
              <input 
                type="text" 
                placeholder="例如：全麦吐司1片 + 香蕉半根 + 温开水150ml" 
                className="apple-input" 
                value={preMeal} 
                onChange={(e) => setPreMeal(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">课后 30 分钟黄金修复加餐</label>
              <input 
                type="text" 
                placeholder="例如：温纯牛奶250ml + 水煮蛋1个 + 蓝莓一把" 
                className="apple-input" 
                value={postMeal} 
                onChange={(e) => setPostMeal(e.target.value)} 
              />
            </div>

            {/* Micronutrients checklist */}
            <div className="form-group">
              <label className="form-label">生长关键微量元素打卡</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
                <div 
                  onClick={() => setCalciumTaken(!calciumTaken)}
                  style={{ 
                    cursor: 'pointer',
                    padding: '10px 8px', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--card-border)',
                    background: calciumTaken ? 'rgba(52, 199, 89, 0.1)' : '#fff',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: calciumTaken ? '#248a3d' : 'var(--secondary-color)'
                  }}
                >
                  {calciumTaken ? <CheckSquare size={16} color="#34c759" /> : <Square size={16} />}
                  钙+维生素D3
                </div>

                <div 
                  onClick={() => setIronTaken(!ironTaken)}
                  style={{ 
                    cursor: 'pointer',
                    padding: '10px 8px', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--card-border)',
                    background: ironTaken ? 'rgba(52, 199, 89, 0.1)' : '#fff',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: ironTaken ? '#248a3d' : 'var(--secondary-color)'
                  }}
                >
                  {ironTaken ? <CheckSquare size={16} color="#34c759" /> : <Square size={16} />}
                  铁+维C(防贫血)
                </div>

                <div 
                  onClick={() => setZincTaken(!zincTaken)}
                  style={{ 
                    cursor: 'pointer',
                    padding: '10px 8px', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--card-border)',
                    background: zincTaken ? 'rgba(52, 199, 89, 0.1)' : '#fff',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    color: zincTaken ? '#248a3d' : 'var(--secondary-color)'
                  }}
                >
                  {zincTaken ? <CheckSquare size={16} color="#34c759" /> : <Square size={16} />}
                  锌与鱼油DHA
                </div>
              </div>
            </div>

            <div className="grid-3" style={{ gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">昨夜睡眠 (小时)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  placeholder="例如 9.8" 
                  className="apple-input" 
                  value={sleepHours} 
                  onChange={(e) => setSleepHours(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">晨起静息心率 (bpm)</label>
                <input 
                  type="number" 
                  step="1" 
                  placeholder="例如 71" 
                  className="apple-input" 
                  value={morningPulse} 
                  onChange={(e) => setMorningPulse(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">精力恢复评分</label>
                <select className="apple-select" value={recoveryScore} onChange={(e) => setRecoveryScore(e.target.value)}>
                  <option value="5">5星 - 极度充沛</option>
                  <option value="4">4星 - 状态良好</option>
                  <option value="3">3星 - 一般疲惫</option>
                  <option value="2">2星 - 略微乏力</option>
                  <option value="1">1星 - 深度疲惫</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">营养与恢复心得</label>
              <textarea 
                placeholder="例如：晚上21:15准时上床入睡，晨起心率平稳，胃口很好..." 
                className="apple-textarea" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
              />
            </div>

            <button 
              type="submit" 
              className="apple-btn apple-btn-primary mt-sm" 
              style={{ width: '100%', background: editingId ? '#af52de' : '#248a3d' }}
              disabled={loading}
            >
              {loading ? '正在保存...' : editingId ? '保存修改' : '保存营养恢复日志'}
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
            <Apple size={20} style={{ color: '#248a3d' }} />
            营养与机体恢复记录
          </h3>

          {sortedNutrition.length > 0 ? (
            <div className="history-table-container" style={{ maxHeight: '560px', overflowY: 'auto' }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>课前/课后加餐</th>
                    <th>微量元素/水</th>
                    <th>睡眠/恢复</th>
                    <th style={{ textAlign: 'right' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedNutrition.map((n) => (
                    <tr key={n.id} style={{ background: editingId === n.id ? 'rgba(175, 82, 222, 0.05)' : '' }}>
                      <td>
                        <div className="flex-gap-sm" style={{ fontWeight: 600 }}>
                          <Calendar size={13} className="text-secondary" />
                          {n.date}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                          后: {n.postMeal?.slice(0, 18)}...
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--secondary-color)', marginTop: '2px' }}>
                          前: {n.preMeal?.slice(0, 16)}...
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)' }}>
                          {n.waterMl} ml 水合
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#34c759', marginTop: '2px' }}>
                          {[n.calciumTaken && '钙D3', n.ironTaken && '铁VC', n.zincTaken && '锌'].filter(Boolean).join(' · ')}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {n.sleepHours} 小时
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--secondary-color)' }}>
                          晨脉: {n.morningPulse ? `${n.morningPulse}次` : '--'} | {'★'.repeat(n.recoveryScore || 5)}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleStartEdit(n)} 
                            className="apple-btn apple-btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '10px', color: '#af52de' }}
                            title="修改"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => onDeleteNutrition(n.id)} 
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
              暂无营养恢复记录，请在左侧表单中录入。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
