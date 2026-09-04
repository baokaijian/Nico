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

const SERVER_URL = 'http://localhost:3001';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [growthRecords, setGrowthRecords] = useState([]);
  const [swimRecords, setSwimRecords] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [fitnessRecords, setFitnessRecords] = useState([]);
  const [nutritionRecords, setNutritionRecords] = useState([]);
  const [goals, setGoals] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  
  // Loading and Error statuses
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all data from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [
        growthRes, 
        swimRes, 
        mediaRes, 
        trainingsRes, 
        fitnessRes, 
        nutritionRes, 
        goalsRes
      ] = await Promise.all([
        fetch(`${SERVER_URL}/api/growth`),
        fetch(`${SERVER_URL}/api/swim`),
        fetch(`${SERVER_URL}/api/media`),
        fetch(`${SERVER_URL}/api/trainings`),
        fetch(`${SERVER_URL}/api/fitness`),
        fetch(`${SERVER_URL}/api/nutrition`),
        fetch(`${SERVER_URL}/api/goals`)
      ]);

      if (!growthRes.ok || !swimRes.ok || !mediaRes.ok) {
        throw new Error('基础接口服务响应异常');
      }

      const growthData = await growthRes.json();
      const swimData = await swimRes.json();
      const mediaData = await mediaRes.json();
      const trainingsData = trainingsRes.ok ? await trainingsRes.json() : [];
      const fitnessData = fitnessRes.ok ? await fitnessRes.json() : [];
      const nutritionData = nutritionRes.ok ? await nutritionRes.json() : [];
      const goalsData = goalsRes.ok ? await goalsRes.json() : [];

      setGrowthRecords(growthData);
      setSwimRecords(swimData);
      setMediaList(mediaData);
      setTrainings(trainingsData);
      setFitnessRecords(fitnessData);
      setNutritionRecords(nutritionData);
      setGoals(goalsData);
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

  // Training record callbacks
  const handleAddTraining = async (record) => {
    const res = await fetch(`${SERVER_URL}/api/trainings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('保存水上训练记录失败');
    const newRecord = await res.json();
    setTrainings(prev => [...prev, newRecord].sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const handleDeleteTraining = async (id) => {
    if (!window.confirm('您确定要删除此条水上训练记录吗？')) return;
    const res = await fetch(`${SERVER_URL}/api/trainings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除水上训练记录失败');
    setTrainings(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTraining = async (id, record) => {
    const res = await fetch(`${SERVER_URL}/api/trainings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('更新水上训练记录失败');
    const updated = await res.json();
    setTrainings(prev => prev.map(t => t.id === id ? updated : t).sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  // Fitness record callbacks
  const handleAddFitness = async (record) => {
    const res = await fetch(`${SERVER_URL}/api/fitness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('保存陆上体能记录失败');
    const newRecord = await res.json();
    setFitnessRecords(prev => [...prev, newRecord].sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const handleDeleteFitness = async (id) => {
    if (!window.confirm('您确定要删除此条陆上体能记录吗？')) return;
    const res = await fetch(`${SERVER_URL}/api/fitness/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除陆上体能记录失败');
    setFitnessRecords(prev => prev.filter(f => f.id !== id));
  };

  const handleUpdateFitness = async (id, record) => {
    const res = await fetch(`${SERVER_URL}/api/fitness/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('更新陆上体能记录失败');
    const updated = await res.json();
    setFitnessRecords(prev => prev.map(f => f.id === id ? updated : f).sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  // Nutrition record callbacks
  const handleAddNutrition = async (record) => {
    const res = await fetch(`${SERVER_URL}/api/nutrition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('保存营养恢复记录失败');
    const newRecord = await res.json();
    setNutritionRecords(prev => [...prev, newRecord].sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const handleDeleteNutrition = async (id) => {
    if (!window.confirm('您确定要删除此条营养恢复记录吗？')) return;
    const res = await fetch(`${SERVER_URL}/api/nutrition/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除营养恢复记录失败');
    setNutritionRecords(prev => prev.filter(n => n.id !== id));
  };

  const handleUpdateNutrition = async (id, record) => {
    const res = await fetch(`${SERVER_URL}/api/nutrition/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('更新营养恢复记录失败');
    const updated = await res.json();
    setNutritionRecords(prev => prev.map(n => n.id === id ? updated : n).sort((a, b) => new Date(a.date) - new Date(b.date)));
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
            <span style={{ fontSize: '0.68rem', color: 'var(--secondary-color)', fontWeight: 500 }}>
              杭州大关三线运动员 · 梯队档案
            </span>
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

            {activeTab === 'fitness' && (
              <FitnessLogger 
                fitnessRecords={fitnessRecords} 
                onAddFitness={handleAddFitness} 
                onUpdateFitness={handleUpdateFitness} 
                onDeleteFitness={handleDeleteFitness} 
              />
            )}

            {activeTab === 'nutrition' && (
              <NutritionLogger 
                nutritionRecords={nutritionRecords} 
                onAddNutrition={handleAddNutrition} 
                onUpdateNutrition={handleUpdateNutrition} 
                onDeleteNutrition={handleDeleteNutrition} 
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
