import React, { useState, useEffect } from 'react';
import { Activity, Ruler, Image as ImageIcon, LayoutDashboard } from 'lucide-react';
import Dashboard from './components/Dashboard';
import GrowthLogger from './components/GrowthLogger';
import SwimLogger from './components/SwimLogger';
import MediaGallery from './components/MediaGallery';

const SERVER_URL = 'http://localhost:3001';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [growthRecords, setGrowthRecords] = useState([]);
  const [swimRecords, setSwimRecords] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  
  // Loading and Error statuses
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all data from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [growthRes, swimRes, mediaRes] = await Promise.all([
        fetch(`${SERVER_URL}/api/growth`),
        fetch(`${SERVER_URL}/api/swim`),
        fetch(`${SERVER_URL}/api/media`)
      ]);

      if (!growthRes.ok || !swimRes.ok || !mediaRes.ok) {
        throw new Error('服务器响应异常');
      }

      const growthData = await growthRes.json();
      const swimData = await swimRes.json();
      const mediaData = await mediaRes.json();

      setGrowthRecords(growthData);
      setSwimRecords(swimData);
      setMediaList(mediaData);
      setError('');
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('无法连接到本地后端服务。请确保 Express 服务已在 3001 端口正常启动。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Growth record callbacks
  const handleAddGrowth = async (record) => {
    const res = await fetch(`${SERVER_URL}/api/growth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('保存身体记录失败');
    const newRecord = await res.json();
    setGrowthRecords(prev => [...prev, newRecord].sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const handleDeleteGrowth = async (id) => {
    if (!window.confirm('您确定要删除此条身体数据记录吗？')) return;
    const res = await fetch(`${SERVER_URL}/api/growth/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除身体记录失败');
    setGrowthRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateGrowth = async (id, record) => {
    const res = await fetch(`${SERVER_URL}/api/growth/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('更新身体记录失败');
    const updated = await res.json();
    setGrowthRecords(prev => prev.map(r => r.id === id ? updated : r).sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  // Swim record callbacks
  const handleAddSwim = async (record) => {
    const res = await fetch(`${SERVER_URL}/api/swim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('保存成绩记录失败');
    const newRecord = await res.json();
    setSwimRecords(prev => [...prev, newRecord].sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const handleDeleteSwim = async (id) => {
    if (!window.confirm('您确定要删除此条成绩记录吗？')) return;
    const res = await fetch(`${SERVER_URL}/api/swim/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除成绩记录失败');
    setSwimRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateSwim = async (id, record) => {
    const res = await fetch(`${SERVER_URL}/api/swim/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('更新成绩记录失败');
    const updated = await res.json();
    setSwimRecords(prev => prev.map(r => r.id === id ? updated : r).sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  // Media record callbacks
  const handleAddMedia = async (formData) => {
    const res = await fetch(`${SERVER_URL}/api/media`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('上传相册文件失败');
    const newMedia = await res.json();
    setMediaList(prev => [newMedia, ...prev]);
  };

  const handleDeleteMedia = async (id) => {
    if (!window.confirm('您确定要删除这个相册文件吗？')) return;
    const res = await fetch(`${SERVER_URL}/api/media/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除相册文件失败');
    setMediaList(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div>
      {/* Frosted Glass Navigation Bar */}
      <nav className="glass-nav">
        <div className="nav-brand">
          <Activity size={24} style={{ color: 'var(--accent-color)' }} />
          <span>Nico 的游泳成长记录</span>
        </div>
        
        <div className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} />
            <span>成长看板</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'growth' ? 'active' : ''}`}
            onClick={() => setActiveTab('growth')}
          >
            <Ruler size={16} />
            <span>身体数据</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'swim' ? 'active' : ''}`}
            onClick={() => setActiveTab('swim')}
          >
            <Activity size={16} />
            <span>成绩记录</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            <ImageIcon size={16} />
            <span>训练相册</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container">
        {error && (
          <div className="glass-card" style={{ borderLeft: '4px solid rgb(255, 59, 48)', marginBottom: 'var(--space-lg)' }}>
            <h3 style={{ color: 'rgb(255, 59, 48)', marginBottom: '8px' }}>本地服务连接失败</h3>
            <p style={{ color: 'var(--secondary-color)', fontSize: '0.95rem' }}>{error}</p>
            <button 
              className="apple-btn apple-btn-secondary mt-md"
              onClick={fetchData}
            >
              重试连接
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--card-border)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--secondary-color)', fontWeight: 500 }}>正在加载 Nico 的成长数据...</p>
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}} />
          </div>
        ) : (
          <main style={{ animation: 'fadeIn 0.4s ease' }}>
            {activeTab === 'dashboard' && (
              <Dashboard 
                growthRecords={growthRecords} 
                swimRecords={swimRecords} 
              />
            )}
            
            {activeTab === 'growth' && (
              <GrowthLogger 
                records={growthRecords} 
                onAddRecord={handleAddGrowth} 
                onDeleteRecord={handleDeleteGrowth} 
                onUpdateRecord={handleUpdateGrowth} 
              />
            )}
            
            {activeTab === 'swim' && (
              <SwimLogger 
                records={swimRecords} 
                onAddRecord={handleAddSwim} 
                onDeleteRecord={handleDeleteSwim} 
                onUpdateRecord={handleUpdateSwim} 
              />
            )}
            
            {activeTab === 'media' && (
              <MediaGallery 
                mediaList={mediaList} 
                onAddMedia={handleAddMedia} 
                onDeleteMedia={handleDeleteMedia} 
                serverUrl={SERVER_URL}
              />
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}} />
          </main>
        )}
      </div>
    </div>
  );
}
