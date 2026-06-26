import React, { useState } from 'react';
import { Plus, Calendar, Activity, Trash2, Edit2, X } from 'lucide-react';

export default function SwimLogger({ records, onAddRecord, onDeleteRecord, onUpdateRecord }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [distance, setDistance] = useState('25m');
  const [customDistance, setCustomDistance] = useState('');
  const [stroke, setStroke] = useState('自由泳');
  
  // Time inputs: Minutes, Seconds, Hundredths (hh)
  const [mins, setMins] = useState('');
  const [secs, setSecs] = useState('');
  const [hunds, setHunds] = useState('');

  const [poolLength, setPoolLength] = useState('25m');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Table Filter states
  const [filterStroke, setFilterStroke] = useState('All');
  const [filterDistance, setFilterDistance] = useState('All');

  const handleStartEdit = (r) => {
    setEditingId(r.id);
    setDate(r.date);
    setStroke(r.stroke);
    setPoolLength(r.poolLength);
    setNotes(r.notes || '');

    const predefinedDistances = ['25m', '50m', '100m', '200m', '400m'];
    if (predefinedDistances.includes(r.distance)) {
      setDistance(r.distance);
      setCustomDistance('');
    } else {
      setDistance('Custom');
      setCustomDistance(r.distance);
    }

    // Parse time MM:SS.hh or SS.hh
    if (r.time) {
      const parts = r.time.split(':');
      if (parts.length === 2) {
        // MM:SS.hh
        const m = parseInt(parts[0], 10);
        setMins(m === 0 ? '' : m.toString());
        const subparts = parts[1].split('.');
        setSecs(subparts[0] || '');
        setHunds(subparts[1] || '');
      } else {
        // SS.hh
        setMins('');
        const subparts = r.time.split('.');
        setSecs(subparts[0] || '');
        setHunds(subparts[1] || '');
      }
    } else {
      setMins('');
      setSecs('');
      setHunds('');
    }
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setDistance('25m');
    setCustomDistance('');
    setStroke('自由泳');
    setMins('');
    setSecs('');
    setHunds('');
    setPoolLength('25m');
    setNotes('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const actualDistance = distance === 'Custom' ? customDistance : distance;
    if (!date || !actualDistance || !stroke || !secs || !hunds) {
      setError('请填写完整的游泳训练成绩。');
      return;
    }

    setError('');
    setLoading(true);

    // Format time to MM:SS.hh
    const m = mins ? mins.padStart(2, '0') : '00';
    const s = secs.padStart(2, '0');
    const h = hunds.padStart(2, '0');
    const formattedTime = `${m}:${s}.${h}`;

    const recordData = {
      date,
      distance: actualDistance,
      stroke,
      time: formattedTime,
      poolLength,
      notes
    };

    try {
      if (editingId) {
        await onUpdateRecord(editingId, recordData);
        setEditingId(null);
      } else {
        await onAddRecord(recordData);
      }

      // Clear inputs
      setMins('');
      setSecs('');
      setHunds('');
      setNotes('');
      setCustomDistance('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch {
      setError(editingId ? '保存修改失败。' : '保存游泳成绩记录失败。');
    } finally {
      setLoading(false);
    }
  };

  // Sort and Filter records for listing
  const filteredRecords = records.filter(r => {
    const matchStroke = filterStroke === 'All' || r.stroke.toLowerCase() === filterStroke.toLowerCase();
    const matchDistance = filterDistance === 'All' || r.distance === filterDistance;
    return matchStroke && matchDistance;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const strokes = ['自由泳', '蛙泳', '仰泳', '蝶泳', '个人混合泳'];
  const distances = ['25m', '50m', '100m', '200m', '400m'];

  return (
    <div className="grid-2">
      {/* Logger Form */}
      <div className="glass-card">
        <h3 className="mb-md flex-gap-sm">
          <Plus size={20} style={{ color: editingId ? '#af52de' : '#34c759' }} />
          {editingId ? '修改游泳训练成绩' : '游泳训练成绩录入'}
        </h3>

        {error && (
          <div style={{ color: 'rgb(255, 59, 48)', padding: '12px', background: 'rgba(255, 59, 48, 0.08)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.9rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">训练/比赛日期</label>
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
              <label className="form-label">泳姿</label>
              <select 
                className="apple-select" 
                value={stroke} 
                onChange={(e) => setStroke(e.target.value)}
                required
              >
                {strokes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">距离</label>
              <select 
                className="apple-select" 
                value={distance} 
                onChange={(e) => setDistance(e.target.value)}
                required
              >
                {distances.map(d => <option key={d} value={d}>{d}</option>)}
                <option value="Custom">自定义...</option>
              </select>
            </div>
          </div>

          {distance === 'Custom' && (
            <div className="form-group">
              <label className="form-label">自定义距离 (如 800m, 1500m)</label>
              <input 
                type="text" 
                placeholder="例如 800m" 
                className="apple-input" 
                value={customDistance} 
                onChange={(e) => setCustomDistance(e.target.value)}
                required
              />
            </div>
          )}

          {/* Time Entry Block */}
          <div className="form-group">
            <label className="form-label">成绩时间 (分 : 秒 . 百分秒)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="number" 
                min="0"
                max="59"
                placeholder="分" 
                className="apple-input" 
                style={{ textAlign: 'center', padding: '10px 8px' }}
                value={mins} 
                onChange={(e) => setMins(e.target.value.slice(0, 2))}
              />
              <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--secondary-color)' }}>:</span>
              <input 
                type="number" 
                min="0"
                max="59"
                placeholder="秒" 
                className="apple-input" 
                style={{ textAlign: 'center', padding: '10px 8px' }}
                value={secs} 
                onChange={(e) => setSecs(e.target.value.slice(0, 2))}
                required
              />
              <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--secondary-color)' }}>.</span>
              <input 
                type="number" 
                min="0"
                max="99"
                placeholder="秒" 
                className="apple-input" 
                style={{ textAlign: 'center', padding: '10px 8px' }}
                value={hunds} 
                onChange={(e) => setHunds(e.target.value.slice(0, 2))}
                required
              />
            </div>
            <small style={{ color: 'var(--secondary-color)', fontSize: '0.8rem', marginTop: '2px' }}>
              分 : 秒 . 百分秒 (例如 00 : 25 . 10)
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">泳池规格</label>
            <select 
              className="apple-select" 
              value={poolLength} 
              onChange={(e) => setPoolLength(e.target.value)}
              required
            >
              <option value="25m">25米 (短池)</option>
              <option value="50m">50米 (标准长池)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">训练备注与教练反馈</label>
            <textarea 
              placeholder="例如：打腿频率、出发反应时间、转身蹬壁及教练反馈等..." 
              className="apple-textarea" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="apple-btn apple-btn-primary mt-sm" 
            style={{ width: '100%', background: editingId ? '#af52de' : '#34c759' }}
            disabled={loading}
          >
            {loading ? '正在保存...' : editingId ? '保存修改' : '保存成绩记录'}
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

      {/* History Log Table */}
      <div className="glass-card">
        <div className="flex-between mb-md" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <h3 className="flex-gap-sm" style={{ margin: 0 }}>
            <Activity size={20} style={{ color: '#34c759' }} />
            游泳成绩历史记录
          </h3>

          {/* Table Filters */}
          <div className="flex-gap-sm" style={{ flexWrap: 'wrap' }}>
            <select 
              className="apple-select" 
              style={{ padding: '6px 12px', width: 'auto', borderRadius: '12px', fontSize: '0.85rem' }}
              value={filterStroke}
              onChange={(e) => setFilterStroke(e.target.value)}
            >
              <option value="All">所有泳姿</option>
              {strokes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select 
              className="apple-select" 
              style={{ padding: '6px 12px', width: 'auto', borderRadius: '12px', fontSize: '0.85rem' }}
              value={filterDistance}
              onChange={(e) => setFilterDistance(e.target.value)}
            >
              <option value="All">所有距离</option>
              {distances.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {filteredRecords.length > 0 ? (
          <div className="history-table-container" style={{ maxHeight: '580px', overflowY: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>项目</th>
                  <th>成绩时间</th>
                  <th>泳池</th>
                  <th style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.id} style={{ background: editingId === r.id ? 'rgba(175, 82, 222, 0.05)' : '' }}>
                    <td>
                      <div className="flex-gap-sm" style={{ fontWeight: 500 }}>
                        <Calendar size={14} className="text-secondary" />
                        {r.date}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.distance} {r.stroke}</div>
                      {r.notes && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--secondary-color)', fontWeight: 400, marginTop: '2px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.notes}>
                          {r.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{r.time}</td>
                    <td>{r.poolLength === '25m' ? '25米' : '50米'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleStartEdit(r)} 
                          className="apple-btn apple-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '10px', color: '#af52de' }}
                          title="修改记录"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => onDeleteRecord(r.id)} 
                          className="apple-btn apple-btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '10px' }}
                          title="删除记录"
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
            没有符合当前筛选条件的成绩记录。
          </div>
        )}
      </div>
    </div>
  );
}
