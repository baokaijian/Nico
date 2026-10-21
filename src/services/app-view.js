import { loadPublicSummary } from './public-summary.js';

// 查看模式只读取公开白名单；完整档案须经服务端确认会话后才能读取。
export async function loadAppView(api, { mode, adminCapable, base, signal, onSession = () => {} }) {
  let session = null;
  if (adminCapable) {
    try { session = await api.authRequest('session', undefined, { signal }); }
    catch (error) { if (error.status !== 401) throw error; }
  }
  if (signal?.aborted) throw new DOMException('请求已取消', 'AbortError');
  onSession(session);
  if (session?.authenticated && session.mustChangePassword) return { session };
  if (session?.authenticated && mode === 'manage') {
    const privateSnapshot = await api.request('/api/snapshot', { signal });
    return { session, privateSnapshot };
  }
  const publicSnapshot = await loadPublicSummary(api, { live: adminCapable, base, signal });
  return { session, publicSnapshot };
}
