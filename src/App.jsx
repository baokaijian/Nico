import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Waves, Timer, HeartPulse, Apple, 
  Ruler, Sparkles, Image as ImageIcon 
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import TrainingLogger from './components/TrainingLogger';
import SwimLogger from './components/SwimLogger';
import FitnessLogger from './components/FitnessLogger';
import NutritionLogger from './components/NutritionLogger';
import GrowthLogger from './components/GrowthLogger';
import PlanViewer from './components/PlanViewer';
import MediaGallery from './components/MediaGallery';

import initialDb from '../server/db.json';

const SERVER_URL = 'http://localhost:3001';

export default function App() {
  const isReadOnly = typeof window !== 'undefined' && (
    window.location.hostname.includes('github.io') ||
    (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
  );

  const isStaticHost = isReadOnly || (typeof window !== 'undefined' && window.location.protocol === 'https:');

  const getInitial = (key, fallback) => {
    // In read-only mode, always use the authoritative static dataset bundled from db.json
    // to prevent local storage pollution or altered data.
    if (isReadOnly) {
      return fallback || [];
    }
    try {
      const cached = localStorage.getItem(`nico_${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('LocalStorage read error:', e);
    }
    return fallback || [];
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [growthRecords, setGrowthRecords] = useState(() => getInitial('growth', initialDb.growth));
  const [swimRecords, setSwimRecords] = useState(() => getInitial('swim', initialDb.swim));
  const [trainings, setTrainings] = useState(() => getInitial('trainings', initialDb.trainings));
  const [fitnessRecords, setFitnessRecords] = useState(() => getInitial('fitness', initialDb.fitness));
  const [nutritionRecords, setNutritionRecords] = useState(() => getInitial('nutrition', initialDb.nutrition));
  const [goals, setGoals] = useState(() => getInitial('goals', initialDb.goals));
  const [mediaList, setMediaList] = useState(() => getInitial('media', initialDb.media));
  
  // Loading and Error statuses
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const saveAndSync = (key, data, setter) => {
    if (isReadOnly) return;
    setter(data);
    try {
      localStorage.setItem(`nico_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  // Fetch all data from backend (in local development mode)
  const fetchData = async () => {
    if (isStaticHost) {
      setLoading(false);
      setError('');
      return;
    }

    try {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const [
        growthRes, 
        swimRes, 
        mediaRes, 
        trainingsRes, 
        fitnessRes, 
        nutritionRes, 
        goalsRes
      ] = await Promise.all([
        fetch(`${SERVER_URL}/api/growth`, { signal: controller.signal }),
        fetch(`${SERVER_URL}/api/swim`, { signal: controller.signal }),
        fetch(`${SERVER_URL}/api/media`, { signal: controller.signal }),
        fetch(`${SERVER_URL}/api/trainings`, { signal: controller.signal }),
        fetch(`${SERVER_URL}/api/fitness`, { signal: controller.signal }),
        fetch(`${SERVER_URL}/api/nutrition`, { signal: controller.signal }),
        fetch(`${SERVER_URL}/api/goals`, { signal: controller.signal })
      ]);
      clearTimeout(timeoutId);

      if (!growthRes.ok || !swimRes.ok || !mediaRes.ok) {
        throw new Error('基础接口服务响应异常');
      }

      const growthData = await growthRes.json();
      const swimData = await swimRes.json();
      const mediaData = await mediaRes.json();
      const trainingsData = trainingsRes.ok ? await trainingsRes.json() : (initialDb.trainings || []);
      const fitnessData = fitnessRes.ok ? await fitnessRes.json() : (initialDb.fitness || []);
      const nutritionData = nutritionRes.ok ? await nutritionRes.json() : (initialDb.nutrition || []);
      const goalsData = goalsRes.ok ? await goalsRes.json() : (initialDb.goals || []);

      saveAndSync('growth', growthData, setGrowthRecords);
      saveAndSync('swim', swimData, setSwimRecords);
      saveAndSync('media', mediaData, setMediaList);
      saveAndSync('trainings', trainingsData, setTrainings);
      saveAndSync('fitness', fitnessData, setFitnessRecords);
      saveAndSync('nutrition', nutritionData, setNutritionRecords);
      saveAndSync('goals', goalsData, setGoals);
      setError('');
    } catch (err) {
      console.warn('Backend sync failed, using static dataset:', err);
      // Fallback cleanly to embedded dataset if state is empty
      if (!growthRecords.length) {
        setGrowthRecords(initialDb.growth || []);
        setSwimRecords(initialDb.swim || []);
        setTrainings(initialDb.trainings || []);
        setFitnessRecords(initialDb.fitness || []);
        setNutritionRecords(initialDb.nutrition || []);
        setGoals(initialDb.goals || []);
        setMediaList(initialDb.media || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Growth record callbacks
  const handleAddGrowth = async (record) => {
    if (isReadOnly) return;
    let saved = null;
    try {
      if (!isStaticHost) {
        const res = await fetch(`${SERVER_URL}/api/growth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) saved = await res.json();
      }
    } catch (e) {
      console.warn('Remote save failed, saving locally:', e);
    }
    const newRecord = saved || { ...record, id: `g-${Date.now()}` };
    const updated = [...growthRecords, newRecord].sort((a, b) => new Date(a.date) - new Date(b.date));
    saveAndSync('growth', updated, setGrowthRecords);
  };

  const handleDeleteGrowth = async (id) => {
    if (isReadOnly) return;
    if (!window.confirm('您确定要删除此条身体数据记录吗？')) return;
    try {
      if (!isStaticHost) {
        await fetch(`${SERVER_URL}/api/growth/${id}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.warn('Remote delete failed, deleting locally:', e);
    }
    const updated = growthRecords.filter(r => r.id !== id);
    saveAndSync('growth', updated, setGrowthRecords);
  };

  const handleUpdateGrowth = async (id, record) => {
    if (isReadOnly) return;
    let saved = null;
    try {
      if (!isStaticHost) {
        const res = await fetch(`${SERVER_URL}/api/growth/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) saved = await res.json();
      }
    } catch (e) {
      console.warn('Remote update failed, updating locally:', e);
    }
    const updatedRecord = saved || { ...record, id };
    const updated = growthRecords.map(r => r.id === id ? updatedRecord : r).sort((a, b) => new Date(a.date) - new Date(b.date));
    saveAndSync('growth', updated, setGrowthRecords);
  };

  // Swim record callbacks
  const handleAddSwim = async (record) => {
    if (isReadOnly) return;
    let saved = null;
    try {
      if (!isStaticHost) {
        const res = await fetch(`${SERVER_URL}/api/swim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) saved = await res.json();
      }
    } catch (e) {
      console.warn('Remote save failed, saving locally:', e);
    }
    const newRecord = saved || { ...record, id: `s-${Date.now()}` };
    const updated = [...swimRecords, newRecord].sort((a, b) => new Date(a.date) - new Date(b.date));
    saveAndSync('swim', updated, setSwimRecords);
  };

  const handleDeleteSwim = async (id) => {
    if (isReadOnly) return;
    if (!window.confirm('您确定要删除此条成绩记录吗？')) return;
    try {
      if (!isStaticHost) {
        await fetch(`${SERVER_URL}/api/swim/${id}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.warn('Remote delete failed, deleting locally:', e);
    }
    const updated = swimRecords.filter(r => r.id !== id);
    saveAndSync('swim', updated, setSwimRecords);
  };

  const handleUpdateSwim = async (id, record) => {
    if (isReadOnly) return;
    let saved = null;
    try {
      if (!isStaticHost) {
        const res = await fetch(`${SERVER_URL}/api/swim/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) saved = await res.json();
      }
    } catch (e) {
      console.warn('Remote update failed, updating locally:', e);
    }
    const updatedRecord = saved || { ...record, id };
    const updated = swimRecords.map(r => r.id === id ? updatedRecord : r).sort((a, b) => new Date(a.date) - new Date(b.date));
    saveAndSync('swim', updated, setSwimRecords);
  };

  // Training record callbacks
  const handleAddTraining = async (record) => {
    if (isReadOnly) return;
    let saved = null;
    try {
      if (!isStaticHost) {
        const res = await fetch(`${SERVER_URL}/api/trainings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) saved = await res.json();
      }
    } catch (e) {
      console.warn('Remote save failed, saving locally:', e);
    }
    const newRecord = saved || { ...record, id: `t-${Date.now()}` };
    const updated = [...trainings, newRecord].sort((a, b) => new Date(a.date) - new Date(b.date));
    saveAndSync('trainings', updated, setTrainings);
  };

  const handleDeleteTraining = async (id) => {
    if (isReadOnly) return;
    if (!window.confirm('您确定要删除此条水上训练记录吗？')) return;
    try {
      if (!isStaticHost) {
        await fetch(`${SERVER_URL}/api/trainings/${id}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.warn('Remote delete failed, deleting locally:', e);
    }
    const updated = trainings.filter(t => t.id !== id);
    saveAndSync('trainings', updated, setTrainings);
  };

  const handleUpdateTraining = async (id, record) => {
    if (isReadOnly) return;
    let saved = null;
    try {
      if (!isStaticHost) {
        const res = await fetch(`${SERVER_URL}/api/trainings/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) saved = await res.json();
      }
    } catch (e) {
      console.warn('Remote update failed, updating locally:', e);
    }
    const updatedRecord = saved || { ...record, id };
    const updated = trainings.map(t => t.id === id ? updatedRecord : t).sort((a, b) => new Date(a.date) - new Date(b.date));
    saveAndSync('trainings', updated, setTrainings);
  };

  // Fitness record callbacks
  const handleAddFitness = async (record) => {
    if (isReadOnly) return;
    let saved = null;
    try {
      if (!isStaticHost) {
        const res = await fetch(`${SERVER_URL}/api/fitness`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) saved = await res.json();
      }
    } catch (e) {
      console.warn('Remote save failed, saving locally:', e);
    }
    const newRecord = saved || { ...record, id: `f-${Date.now()}` };
    const updated = [...fitnessRecords, newRecord].sort((a, b) => new Date(a.date) - new Date(b.date));
    saveAndSync('fitness', updated, setFitnessRecords);
  };

  const handleDeleteFitness = async (id) => {
    if (isReadOnly) return;
    if (!window.confirm('您确定要删除此条陆上体能记录吗？')) return;
    try {
      if (!isStaticHost) {
        await fetch(`${SERVER_URL}/api/fitness/${id}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.warn('Remote delete failed, deleting locally:', e);
    }
    const updated = fitnessRecords.filter(f => f.id !== id);
    saveAndSync('fitness', updated, setFitnessRecords);
  };

  const handleUpdateFitness = async (id, record) => {
    if (isReadOnly) return;
    let saved = null;
    try {
      if (!isStaticHost) {
        const res = await fetch(`${SERVER_URL}/api/fitness/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) saved = await res.json();
      }
    } catch (e) {
      console.warn('Remote update failed, updating locally:', e);
    }
    const updatedRecord = saved || { ...record, id };
    const updated = fitnessRecords.map(f => f.id === id ? updatedRecord : f).sort((a, b) => new Date(a.date) - new Date(b.date));
    saveAndSync('fitness', updated, setFitnessRecords);
  };

  // Nutrition record callbacks
  const handleAddNutrition = async (record) => {
    if (isReadOnly) return;
    let saved = null;
    try {
      if (!isStaticHost) {
        const res = await fetch(`${SERVER_URL}/api/nutrition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) saved = await res.json();
      }
    } catch (e) {
      console.warn('Remote save failed, saving locally:', e);
    }
    const newRecord = saved || { ...record, id: `n-${Date.now()}` };
    const updated = [...nutritionRecords, newRecord].sort((a, b) => new Date(a.date) - new Date(b.date));
    saveAndSync('nutrition', updated, setNutritionRecords);
  };

  const handleDeleteNutrition = async (id) => {
    if (isReadOnly) return;
    if (!window.confirm('您确定要删除此条营养恢复记录吗？')) return;
    try {
      if (!isStaticHost) {
        await fetch(`${SERVER_URL}/api/nutrition/${id}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.warn('Remote delete failed, deleting locally:', e);
    }
    const updated = nutritionRecords.filter(n => n.id !== id);
    saveAndSync('nutrition', updated, setNutritionRecords);
  };

  const handleUpdateNutrition = async (id, record) => {
    if (isReadOnly) return;
    let saved = null;
    try {
      if (!isStaticHost) {
        const res = await fetch(`${SERVER_URL}/api/nutrition/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (res.ok) saved = await res.json();
      }
    } catch (e) {
      console.warn('Remote update failed, updating locally:', e);
    }
    const updatedRecord = saved || { ...record, id };
    const updated = nutritionRecords.map(n => n.id === id ? updatedRecord : n).sort((a, b) => new Date(a.date) - new Date(b.date));
    saveAndSync('nutrition', updated, setNutritionRecords);
  };

  // Media record callbacks
  const handleAddMedia = async (formData) => {
    if (isReadOnly) return;
    let saved = null;
    try {
      if (!isStaticHost) {
        const res = await fetch(`${SERVER_URL}/api/media`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) saved = await res.json();
      }
    } catch (e) {
      console.warn('Remote media save failed:', e);
    }
    if (saved) {
      const updated = [saved, ...mediaList];
      saveAndSync('media', updated, setMediaList);
    }
  };

  const handleDeleteMedia = async (id) => {
    if (isReadOnly) return;
    if (!window.confirm('您确定要删除这个相册文件吗？')) return;
    try {
      if (!isStaticHost) {
        await fetch(`${SERVER_URL}/api/media/${id}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.warn('Remote media delete failed:', e);
    }
    const updated = mediaList.filter(m => m.id !== id);
    saveAndSync('media', updated, setMediaList);
  };

  return (
    <div>
      {/* Frosted Glass Navigation Bar */}
      <nav className="glass-nav">
        <div className="nav-brand">
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0071e3 0%, #34c759 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(0, 113, 227, 0.3)'
          }}>
            <Waves size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              Nico 竞技游泳成长系统
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--secondary-color)', fontWeight: 500 }}>
                杭州大关三线运动员 · 梯队档案
              </span>
              <span style={{ 
                fontSize: '0.64rem', 
                padding: '2px 8px', 
                borderRadius: '8px', 
                background: isReadOnly ? 'rgba(0, 113, 227, 0.1)' : 'rgba(52, 199, 89, 0.12)',
                color: isReadOnly ? '#0071e3' : '#248a3d',
                border: isReadOnly ? '1px solid rgba(0, 113, 227, 0.25)' : '1px solid rgba(52, 199, 89, 0.25)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {isReadOnly ? '🔒 官方公开档案 · 只读安全模式' : '🟢 本地管理环境 · 可提交上传'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={15} />
            <span>战力看板</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'training' ? 'active' : ''}`}
            onClick={() => setActiveTab('training')}
          >
            <Waves size={15} />
            <span>水上训练</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'swim' ? 'active' : ''}`}
            onClick={() => setActiveTab('swim')}
          >
            <Timer size={15} />
            <span>成绩记录</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'fitness' ? 'active' : ''}`}
            onClick={() => setActiveTab('fitness')}
          >
            <HeartPulse size={15} />
            <span>陆上体能</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'nutrition' ? 'active' : ''}`}
            onClick={() => setActiveTab('nutrition')}
          >
            <Apple size={15} />
            <span>营养恢复</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'growth' ? 'active' : ''}`}
            onClick={() => setActiveTab('growth')}
          >
            <Ruler size={15} />
            <span>身体发育</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            <Sparkles size={15} />
            <span>培养方案</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            <ImageIcon size={15} />
            <span>训练相册</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container">
        {/* Read-Only Safety Banner */}
        {isReadOnly && (
          <div className="glass-card mb-md" style={{
            background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.05) 0%, rgba(52, 199, 89, 0.04) 100%)',
            border: '1px solid rgba(0, 113, 227, 0.18)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                background: '#0071e3', 
                color: '#fff', 
                fontSize: '0.72rem', 
                padding: '2px 8px', 
                borderRadius: '8px', 
                fontWeight: 600 
              }}>
                只读保护
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 500 }}>
                当前为官方公开档案展示版本。为杜绝脏数据污染，已锁定为只读模式；新数据仅支持本地管理环境录入后统一同步上传。
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--secondary-color)', fontWeight: 500 }}>
              已载入最新权威档案 · 防篡改已启用
            </span>
          </div>
        )}

        {error && !isStaticHost && (
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
            <p style={{ color: 'var(--secondary-color)', fontWeight: 500 }}>正在加载 Nico 大关三线成长数据...</p>
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
                trainings={trainings}
                fitnessRecords={fitnessRecords}
                nutritionRecords={nutritionRecords}
                goals={goals}
              />
            )}

            {activeTab === 'training' && (
              <TrainingLogger 
                trainings={trainings} 
                onAddTraining={handleAddTraining} 
                onUpdateTraining={handleUpdateTraining} 
                onDeleteTraining={handleDeleteTraining} 
                isReadOnly={isReadOnly}
              />
            )}
            
            {activeTab === 'swim' && (
              <SwimLogger 
                records={swimRecords} 
                onAddRecord={handleAddSwim} 
                onDeleteRecord={handleDeleteSwim} 
                onUpdateRecord={handleUpdateSwim} 
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'fitness' && (
              <FitnessLogger 
                fitnessRecords={fitnessRecords} 
                onAddFitness={handleAddFitness} 
                onUpdateFitness={handleUpdateFitness} 
                onDeleteFitness={handleDeleteFitness} 
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'nutrition' && (
              <NutritionLogger 
                nutritionRecords={nutritionRecords} 
                onAddNutrition={handleAddNutrition} 
                onUpdateNutrition={handleUpdateNutrition} 
                onDeleteNutrition={handleDeleteNutrition} 
                isReadOnly={isReadOnly}
              />
            )}
            
            {activeTab === 'growth' && (
              <GrowthLogger 
                records={growthRecords} 
                onAddRecord={handleAddGrowth} 
                onDeleteRecord={handleDeleteGrowth} 
                onUpdateRecord={handleUpdateGrowth} 
                isReadOnly={isReadOnly}
              />
            )}

            {activeTab === 'plans' && (
              <PlanViewer 
                growthRecords={growthRecords} 
                swimRecords={swimRecords} 
                trainings={trainings} 
              />
            )}
            
            {activeTab === 'media' && (
              <MediaGallery 
                mediaList={mediaList} 
                onAddMedia={handleAddMedia} 
                onDeleteMedia={handleDeleteMedia} 
                serverUrl={SERVER_URL}
                isReadOnly={isReadOnly}
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
