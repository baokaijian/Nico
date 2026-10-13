export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export function createApi(base = import.meta.env.VITE_API_URL || '', getToken = () => '') {
  let revision = null, csrf = '', accessToken = '', generation = 0, onUnauthorized = () => {};
  const credential = () => accessToken || getToken();
  const credentials = base ? 'omit' : 'same-origin';
  async function request(path, { method = 'GET', body, signal, expectedRevision } = {}) {
    const started = generation;
    const headers = {};
    const token = credential();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (method !== 'GET') {
      if (revision == null) throw new ApiError('请先加载数据再保存', 428);
      headers['If-Match'] = String(expectedRevision ?? revision);
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }
    const multipart = body instanceof FormData;
    if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    let response;
    try { response = await fetch(`${base}${path}`, { method, credentials, headers, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body), signal }); }
    catch (error) { if (error.name === 'AbortError') throw error; throw new ApiError('连接失败，输入已保留，尚未确认是否写入。请先刷新核对，再重试或导出草稿。', 0); }
    let result;
    try { result = await response.json(); } catch { throw new ApiError('服务返回格式异常，未确认保存成功', response.status); }
    if (started !== generation) throw new DOMException('登录状态已改变，已忽略旧会话响应', 'AbortError');
    if (!response.ok) { if (response.status === 401) onUnauthorized(); throw new ApiError(result.error || '请求失败，输入已保留', response.status); }
    const next = response.headers.get('X-Nico-Revision');
    if (next && (revision == null || Number(next) >= revision)) revision = Number(next);
    return result;
  }
  function upload(body, onProgress) {
    const started = generation;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${base}/api/media`);
      xhr.withCredentials = !base;
      const token = credential(); if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf);
      if (revision == null) return reject(new ApiError('请先加载数据', 428));
      xhr.setRequestHeader('If-Match', String(revision));
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
      xhr.onerror = () => reject(new ApiError('上传结果未确认，文件选择与说明已保留；请先刷新核对再重试', 0));
      xhr.onload = () => {
        if (started !== generation) return reject(new DOMException('登录状态已改变，已忽略旧上传响应', 'AbortError'));
        let result; try { result = JSON.parse(xhr.responseText); } catch { return reject(new ApiError('上传响应无效', xhr.status)); }
        if (xhr.status < 200 || xhr.status >= 300) { if (xhr.status === 401) onUnauthorized(); return reject(new ApiError(result.error || '上传失败', xhr.status)); }
        const next = xhr.getResponseHeader('X-Nico-Revision'); if (next && Number(next) >= revision) revision = Number(next);
        resolve(result);
      };
      xhr.send(body);
    });
  }
  async function mediaFile(id, variant, signal) {
    const started = generation;
    const token = credential();
    try {
      const res = await fetch(`${base}/api/media/${encodeURIComponent(id)}/content/${variant}`, { credentials, headers: token ? { Authorization: `Bearer ${token}` } : {}, signal });
      if (res.status === 401) onUnauthorized();
      if (!res.ok) throw new ApiError('素材暂不可用，请刷新处理状态或选择原片', res.status);
      const blob = await res.blob();
      if (started !== generation) throw new DOMException('登录状态已改变，已忽略旧素材响应', 'AbortError');
      return blob;
    } catch (problem) {
      if (problem.name === 'AbortError' || problem instanceof ApiError) throw problem;
      throw new ApiError('连接中断，未能读取素材。请检查连接后重新打开。', 0);
    }
  }
  const mediaBlob = async (id, variant, signal) => URL.createObjectURL(await mediaFile(id, variant, signal));
  async function authRequest(action, body, { signal } = {}) {
    const started = generation;
    const token = credential();
    const response = await fetch(`${base}/api/auth/${action}`, { method: body === undefined ? 'GET' : 'POST', signal, credentials, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    let result; try { result = await response.json(); } catch { throw new ApiError('登录服务暂不可用，请稍后重试', response.status); }
    if (started !== generation) throw new DOMException('登录状态已改变', 'AbortError');
    if (!response.ok) throw new ApiError(result.error || '账号操作失败', response.status);
    if (result.csrf) csrf = result.csrf;
    if (result.accessToken) accessToken = result.accessToken; // Memory only; never persist credentials in browser storage.
    return result;
  }
  const resetAuth = () => { generation++; revision = null; csrf = ''; accessToken = ''; };
  return { cloudMode: /\/functions\/v1\/nico-api\/?$/.test(base), request, upload, mediaBlob, mediaFile, authRequest, resetAuth, setOnUnauthorized: handler => { onUnauthorized = handler; }, getRevision: () => revision,
    publicMediaUrl: url => base ? `${base}/api/public-media/${encodeURIComponent(url.split('/').pop())}` : `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}` };
}
