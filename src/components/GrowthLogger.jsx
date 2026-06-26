import React, { useState } from 'react';
import { Ruler, Plus, Calendar, Trash2, Edit2, X } from 'lucide-react';

export default function GrowthLogger({ records, onAddRecord, onDeleteRecord, onUpdateRecord }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [height, setHeight] = useState('');
  const [armSpan, setArmSpan] = useState('');
  const [weight, setWeight] = useState('');
  const [handLength, setHandLength] = useState('');
  const [handWidth, setHandWidth] = useState('');
  const [footLength, setFootLength] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartEdit = (r) => {
    setEditingId(r.id);
    setDate(r.date);
    setHeight(r.height !== null && r.height !== undefined ? r.height.toString() : '');
    setArmSpan(r.armSpan !== null && r.armSpan !== undefined ? r.armSpan.toString() : '');
    setWeight(r.weight !== null && r.weight !== undefined ? r.weight.toString() : '');
    setHandLength(r.handLength !== null && r.handLength !== undefined ? r.handLength.toString() : '');
    setHandWidth(r.handWidth !== null && r.handWidth !== undefined ? r.handWidth.toString() : '');
    setFootLength(r.footLength !== null && r.footLength !== undefined ? r.footLength.toString() : '');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setHeight('');
    setArmSpan('');
    setWeight('');
    setHandLength('');
    setHandWidth('');
    setFootLength('');
    setDate(new Date().toISOString().split('T')[0]);
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
      height: height ? parseFloat(height) : null,
      armSpan: armSpan ? parseFloat(armSpan) : null,
      weight: weight ? parseFloat(weight) : null,
      handLength: handLength ? parseFloat(handLength) : null,
      handWidth: handWidth ? parseFloat(handWidth) : null,
      footLength: footLength ? parseFloat(footLength) : null
    };

    try {
      if (editingId) {
        await onUpdateRecord(editingId, recordData);
        setEditingId(null);
      } else {
        await onAddRecord(recordData);
      }
      
      // Clear inputs
      setHeight('');
      setArmSpan('');
      setWeight('');
      setHandLength('');
      setHandWidth('');
      setFootLength('');
      setDate(new Date().toISOString().split('T')[0]);
    } catch {
      setError(editingId ? '身体数据更新失败。' : '身体指标保存失败。');
    } finally {
      setLoading(false);
    }
  };

  // Sort records newest first for the list display
  const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="grid-2">
      {/* Logger Form */}
      <div className="glass-card">
        <h3 className="mb-md flex-gap-sm">
          <Plus size={20} style={{ color: editingId ? '#af52de' : 'var(--accent-color)' }} />
          {editingId ? '修改身体成长数据' : '身体成长数据录入'}
        </h3>
        
        {error && (
          <div style={{ color: 'rgb(255, 59, 48)', padding: '12px', background: 'rgba(255, 59, 48, 0.08)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.9rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">测量日期</label>
              <input 
                type="date" 
                className="apple-input" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">体重 (kg)</label>
              <input 
                type="number" 
                step="0.1" 
                placeholder="例如 20.5" 
                className="apple-input" 
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">身高 (cm)</label>
              <input 
                type="number" 
                step="0.1" 
                placeholder="例如 115.5" 
                className="apple-input" 
                value={height} 
                onChange={(e) => setHeight(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">臂展 (cm)</label>
              <input 
                type="number" 
                step="0.1" 
                placeholder="例如 115.0" 
                className="apple-input" 
                value={armSpan} 
                onChange={(e) => setArmSpan(e.target.value)} 
              />
            </div>
          </div>

          <div className="grid-3" style={{ gap: '8px' }}>
            <div className="form-group">
              <label className="form-label">手长 (cm)</label>
              <input 
                type="number" 
                step="0.1" 
                placeholder="例如 12.5" 
                className="apple-input" 
                value={handLength} 
                onChange={(e) => setHandLength(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">手宽 (cm)</label>
              <input 
                type="number" 
                step="0.1" 
                placeholder="例如 5.8" 
                className="apple-input" 
                value={handWidth} 
                onChange={(e) => setHandWidth(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">脚长 (cm)</label>
              <input 
                type="number" 
                step="0.1" 
                placeholder="例如 18.2" 
                className="apple-input" 
                value={footLength} 
                onChange={(e) => setFootLength(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="apple-btn apple-btn-primary mt-sm" 
            style={{ width: '100%', background: editingId ? '#af52de' : 'var(--accent-color)' }}
            disabled={loading}
          >
            {loading ? '正在保存...' : editingId ? '保存修改' : '保存身体记录'}
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

      {/* History Log */}
      <div className="glass-card">
        <h3 className="mb-md flex-gap-sm">
          <Ruler size={20} style={{ color: 'var(--accent-color)' }} />
          身体数据历史记录
        </h3>

        {sortedRecords.length > 0 ? (
          <div className="history-table-container" style={{ maxHeight: '480px', overflowY: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>身高/臂展</th>
                  <th>体重</th>
                  <th>手长/宽</th>
                  <th>脚长</th>
                  <th style={{ textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((r) => (
                  <tr key={r.id} style={{ background: editingId === r.id ? 'rgba(175, 82, 222, 0.05)' : '' }}>
                    <td>
                      <div className="flex-gap-sm" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                        <Calendar size={13} className="text-secondary" />
                        {r.date}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.9rem' }}>身: {r.height ? `${r.height} cm` : '--'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)' }}>展: {r.armSpan ? `${r.armSpan} cm` : '--'}</div>
                    </td>
                    <td>{r.weight ? `${r.weight} kg` : '--'}</td>
                    <td>
                      <div style={{ fontSize: '0.9rem' }}>长: {r.handLength ? `${r.handLength} cm` : '--'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--secondary-color)' }}>宽: {r.handWidth ? `${r.handWidth} cm` : '--'}</div>
                    </td>
                    <td>{r.footLength ? `${r.footLength} cm` : '--'}</td>
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
            暂无历史数据。在左侧表单中录入数据即可查看历史。
          </div>
        )}
      </div>
    </div>
  );
}
