import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Video as VideoIcon, Plus, Play, X, Trash2, Upload } from 'lucide-react';

export default function MediaGallery({ 
  mediaList, 
  onAddMedia, 
  onDeleteMedia, 
  serverUrl,
  isReadOnly = false 
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('日常训练');
  const [file, setFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Lightbox view state
  const [activeMedia, setActiveMedia] = useState(null);
  const fileInputRef = useRef(null);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveMedia(null);
    };
    if (activeMedia) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeMedia]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('请选择要上传的图片或视频文件。');
      return;
    }

    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('date', date);
    formData.append('category', category);

    try {
      await onAddMedia(formData);
      // Clear inputs and close modal
      setTitle('');
      setDescription('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUploadModal(false);
    } catch {
      setError('文件上传失败。请确保文件是图片或视频格式，且大小在 50MB 以内。');
    } finally {
      setLoading(false);
    }
  };

  const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : base + '/';
    if (isReadOnly || window.location.protocol === 'https:' || !serverUrl) {
      return `${cleanBase}${url.replace(/^\//, '')}`;
    }
    return `${serverUrl}${url}`;
  };

  const getMediaFallbackUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : base + '/';
    if (isReadOnly || window.location.protocol === 'https:' || !serverUrl) {
      return `${cleanBase}docs/${url.replace(/^\//, '')}`;
    }
    return `${serverUrl}${url}`;
  };

  return (
    <div>
      <div className="flex-between mb-md">
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            相册与视频
          </h2>
          <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', marginTop: '4px' }}>
            记录 Nico 在大关三线队的真实训练影像与比赛高光时刻
          </p>
        </div>
        {!isReadOnly && (
          <button 
            onClick={() => setShowUploadModal(true)} 
            className="apple-btn apple-btn-primary"
            style={{ background: 'var(--accent-color)' }}
          >
            <Plus size={18} />
            上传照片/视频
          </button>
        )}
      </div>

      {isReadOnly && (
        <div className="glass-card mb-md" style={{ 
          background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.05) 0%, rgba(52, 199, 89, 0.05) 100%)',
          border: '1px solid rgba(0, 113, 227, 0.18)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderRadius: 'var(--radius-md)'
        }}>
          <span style={{ background: '#0071e3', color: '#fff', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '8px', fontWeight: 600 }}>
            只读在线播放
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 500 }}>
            支持视频与图片直接在线高清浏览与播放，无需下载任何源文件；新相册影像仅在本地管理环境提交。
          </span>
        </div>
      )}

      {/* Media Grid */}
      {mediaList.length > 0 ? (
        <div className="media-grid">
          {mediaList.map((m) => {
            const fileUrl = getMediaUrl(m.url);
            return (
              <div key={m.id} className="glass-card media-card">
                <div 
                  className="media-thumbnail-container" 
                  onClick={() => setActiveMedia(m)}
                  style={{ cursor: 'pointer' }}
                >
                  {m.type === 'video' ? (
                    <>
                      <video 
                        className="media-thumbnail" 
                        preload="metadata"
                        muted
                        playsInline
                        src={`${fileUrl}#t=0.001`}
                        onError={(e) => {
                          const fallback = `${getMediaFallbackUrl(m.url)}#t=0.001`;
                          if (e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                          }
                        }}
                      />
                      <div className="media-play-btn" title="点击在线播放">
                        <Play size={22} fill="var(--accent-color)" style={{ marginLeft: '2px' }} />
                      </div>
                    </>
                  ) : (
                    <img 
                      src={fileUrl} 
                      alt={m.title} 
                      className="media-thumbnail" 
                      onError={(e) => {
                        const fallback = getMediaFallbackUrl(m.url);
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                    />
                  )}
                  <span className="media-badge">{m.category}</span>
                </div>
                
                <div className="media-body">
                  <div className="flex-between">
                    <span className="media-meta">{m.date}</span>
                    {!isReadOnly && (
                      <button 
                        onClick={() => onDeleteMedia(m.id)}
                        className="apple-btn apple-btn-danger"
                        style={{ padding: '4px 8px', borderRadius: '8px' }}
                        title="删除媒体"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div className="media-title flex-gap-sm" onClick={() => setActiveMedia(m)} style={{ cursor: 'pointer' }}>
                    {m.type === 'video' ? <VideoIcon size={16} className="text-secondary" /> : <ImageIcon size={16} className="text-secondary" />}
                    {m.title}
                  </div>
                  {m.description && <p className="media-description">{m.description}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card text-center" style={{ padding: 'var(--space-xxl) 0' }}>
          <ImageIcon size={48} className="text-secondary mb-sm" />
          <p style={{ color: 'var(--secondary-color)', fontSize: '1.1rem' }}>相册中暂无照片或视频。</p>
          {!isReadOnly && (
            <button 
              onClick={() => setShowUploadModal(true)} 
              className="apple-btn apple-btn-secondary mt-md"
            >
              上传第一张训练影像
            </button>
          )}
        </div>
      )}

      {/* Upload Modal Drawer */}
      {!isReadOnly && showUploadModal && (
        <div className="lightbox" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', background: '#ffffff', color: 'var(--primary-color)' }}>
            <div className="flex-between mb-md">
              <h3>上传训练相册/视频</h3>
              <button 
                onClick={() => setShowUploadModal(false)} 
                className="apple-btn" 
                style={{ background: 'transparent', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ color: 'rgb(255, 59, 48)', padding: '12px', background: 'rgba(255, 59, 48, 0.08)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">选择文件 (支持图片或视频)</label>
                <div 
                  style={{ border: '2px dashed rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.01)' }}
                  onClick={() => fileInputRef.current.click()}
                >
                  <Upload size={24} style={{ color: 'var(--secondary-color)', marginBottom: '4px' }} />
                  <p style={{ fontSize: '0.9rem', color: 'var(--secondary-color)' }}>
                    {file ? `已选择: ${file.name}` : '点击此处选择照片或视频'}
                  </p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                    accept="image/*,video/*"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">标题</label>
                <input 
                  type="text" 
                  placeholder="例如：25米自由泳训练" 
                  className="apple-input" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">描述/备注</label>
                <textarea 
                  placeholder="例如：出发动作要领，换气时头偏转的角度等细节分析..." 
                  className="apple-textarea" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                />
              </div>

              <div className="grid-2" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">日期</label>
                  <input 
                    type="date" 
                    className="apple-input" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">分类</label>
                  <select 
                    className="apple-select" 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="日常训练">日常训练</option>
                    <option value="比赛时刻">比赛时刻</option>
                    <option value="成长瞬间">成长瞬间</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className="apple-btn apple-btn-primary mt-md" 
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? '正在上传...' : '确认上传'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Video Player Modal */}
      {activeMedia && (
        <div className="lightbox" onClick={() => setActiveMedia(null)}>
          <button className="lightbox-close" onClick={() => setActiveMedia(null)} title="关闭 (Esc)">
            <X size={24} />
          </button>
          
          <div className="lightbox-content-wrapper" onClick={(e) => e.stopPropagation()}>
            {activeMedia.type === 'video' ? (
              <video 
                key={activeMedia.id}
                className="lightbox-content" 
                controls 
                autoPlay 
                playsInline
                controlsList="nodownload"
                style={{ width: '100%', maxWidth: '900px', maxHeight: '72vh', borderRadius: '12px', background: '#000' }}
                onError={(e) => {
                  const video = e.currentTarget;
                  const fallback = getMediaFallbackUrl(activeMedia.url);
                  if (video.src !== fallback) {
                    video.src = fallback;
                    video.load();
                    video.play().catch(() => {});
                  }
                }}
              >
                <source src={getMediaUrl(activeMedia.url)} type="video/mp4" />
                <source src={getMediaFallbackUrl(activeMedia.url)} type="video/mp4" />
                您的浏览器暂不支持此视频在线播放。
              </video>
            ) : (
              <img 
                key={activeMedia.id}
                src={getMediaUrl(activeMedia.url)} 
                alt={activeMedia.title} 
                className="lightbox-content" 
                style={{ borderRadius: '12px', maxHeight: '75vh', objectFit: 'contain' }}
                onError={(e) => {
                  const fallback = getMediaFallbackUrl(activeMedia.url);
                  if (e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  }
                }}
              />
            )}
            
            <div className="lightbox-caption">
              <h3>{activeMedia.title}</h3>
              <p>{activeMedia.date} • {activeMedia.category}</p>
              {activeMedia.description && <p style={{ marginTop: '8px', color: '#e5e5ea', lineHeight: 1.5 }}>{activeMedia.description}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
