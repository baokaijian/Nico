import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Video as VideoIcon, Plus, Play, X, Trash2, Upload } from 'lucide-react';

export default function MediaGallery({ mediaList, onAddMedia, onDeleteMedia, serverUrl }) {
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

  return (
    <div>
      <div className="flex-between mb-lg">
        <h2 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          相册与视频
        </h2>
        <button 
          onClick={() => setShowUploadModal(true)} 
          className="apple-btn apple-btn-primary"
          style={{ background: 'var(--accent-color)' }}
        >
          <Plus size={18} />
          上传照片/视频
        </button>
      </div>

      {/* Media Grid */}
      {mediaList.length > 0 ? (
        <div className="media-grid">
          {mediaList.map((m) => {
            const fileUrl = m.url.startsWith('http') ? m.url : `${serverUrl}${m.url}`;
            return (
              <div key={m.id} className="glass-card media-card">
                <div 
                  className="media-thumbnail-container" 
                  onClick={() => setActiveMedia(m)}
                  style={{ cursor: 'pointer' }}
                >
                  {m.type === 'video' ? (
                    <>
                      <video className="media-thumbnail" preload="metadata">
                        <source src={fileUrl} type="video/mp4" />
                      </video>
                      <div className="media-play-btn">
                        <Play size={20} fill="var(--accent-color)" />
                      </div>
                    </>
                  ) : (
                    <img src={fileUrl} alt={m.title} className="media-thumbnail" />
                  )}
                  <span className="media-badge">{m.category}</span>
                </div>
                
                <div className="media-body">
                  <div className="flex-between">
                    <span className="media-meta">{m.date}</span>
                    <button 
                      onClick={() => onDeleteMedia(m.id)}
                      className="apple-btn apple-btn-danger"
                      style={{ padding: '4px 8px', borderRadius: '8px' }}
                      title="删除媒体"
                    >
                      <Trash2 size={13} />
                    </button>
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
          <button 
            onClick={() => setShowUploadModal(true)} 
            className="apple-btn apple-btn-secondary mt-md"
          >
            上传第一张训练影像
          </button>
        </div>
      )}

      {/* Upload Modal Drawer */}
      {showUploadModal && (
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
          <button className="lightbox-close" onClick={() => setActiveMedia(null)}>
            <X size={24} />
          </button>
          
          <div className="lightbox-content-wrapper" onClick={(e) => e.stopPropagation()}>
            {activeMedia.type === 'video' ? (
              <video 
                className="lightbox-content" 
                controls 
                autoPlay 
                style={{ width: '100%', maxWidth: '800px', borderRadius: '12px' }}
              >
                <source 
                  src={activeMedia.url.startsWith('http') ? activeMedia.url : `${serverUrl}${activeMedia.url}`} 
                  type="video/mp4" 
                />
                您的浏览器不支持视频播放标签。
              </video>
            ) : (
              <img 
                src={activeMedia.url.startsWith('http') ? activeMedia.url : `${serverUrl}${activeMedia.url}`} 
                alt={activeMedia.title} 
                className="lightbox-content" 
                style={{ borderRadius: '12px' }}
              />
            )}
            
            <div className="lightbox-caption">
              <h3>{activeMedia.title}</h3>
              <p>{activeMedia.date} • {activeMedia.category}</p>
              {activeMedia.description && <p style={{ marginTop: '8px', color: '#e5e5ea' }}>{activeMedia.description}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
