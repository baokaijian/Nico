import { useEffect, useRef, useState } from 'react';

export default function useVideoProcessing(api, onSaved) {
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [error, setError] = useState('');
  const operation = useRef(null), cached = useRef(null), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; operation.current?.abort(); cached.current = null; }; }, []);
  const process = async (record, file) => {
    if (operation.current) return;
    const controller = new AbortController(); operation.current = controller;
    const expectedRevision = api.getRevision();
    setBusy(true); setError(''); setStatus('原片已保存，正在准备兼容播放版本…');
    try {
      let variants = cached.current?.id === record.id && cached.current.sourceUrl === record.url ? cached.current.variants : null;
      if (!variants) {
        const source = file || await api.mediaFile(record.id, 'original', controller.signal);
        const { processVideo } = await import('./video-processing');
        variants = await processVideo(source, { signal: controller.signal, onProgress: value => { if (mounted.current) setStatus(value); } });
        cached.current = { id: record.id, sourceUrl: record.url, variants };
      }
      setStatus('播放副本与封面已生成，正在保存至私有记录库…');
      const body = new FormData();
      body.append('sourceUrl', record.url); body.append('playback', variants.playback, 'playback.mp4'); body.append('poster', variants.poster, 'poster.jpg'); body.append('metadata', JSON.stringify(variants.metadata));
      const saved = await api.request(`/api/media/${encodeURIComponent(record.id)}/variants`, { method: 'POST', body, expectedRevision, signal: controller.signal });
      if (mounted.current) { onSaved('media', saved); cached.current = null; setStatus('兼容播放副本与封面已保存；原片保留。'); }
    } catch (problem) {
      if (!mounted.current) return;
      const message = controller.signal.aborted ? cached.current ? '已停止等待保存结果，原片保留；请先刷新核对是否已保存，再重试。' : '已取消兼容处理，原片仍保留，可在列表重试。' : `原片已保存；${problem.message} ${cached.current ? '生成结果暂存于本页，可重试保存；遇到版本冲突请先刷新核对。' : '可在列表重新处理，不必重复上传原片。'}`;
      setStatus(''); setError(message);
      // Failed/cancelled computation can be shown on another device as well.
      // Do not send another write when auth/network/CAS prevented the variant save.
      if (!cached.current && !problem.status) {
        try { const saved = await api.request(`/api/media/${encodeURIComponent(record.id)}/processing-failure`, { method: 'POST', expectedRevision, body: { sourceUrl: record.url, message: message.slice(0, 300) } }); if (mounted.current) onSaved('media', saved); } catch { /* Original save remains authoritative; failure status was not confirmed. */ }
      }
    } finally { operation.current = null; if (mounted.current) setBusy(false); }
  };
  return { busy, status, error, process, cancel: () => operation.current?.abort() };
}
