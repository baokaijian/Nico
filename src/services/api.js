export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export function createApi(base = import.meta.env.VITE_API_URL || '', getToken = () => '') {
  let revision = null;
  async function request(path, { method = 'GET', body, signal, expectedRevision } = {}) {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (method !== 'GET') {
      if (revision == null) throw new ApiError('请先加载数据再保存', 428);
      headers['If-Match'] = String(expectedRevision ?? revision);
    }
    const multipart = body instanceof FormData;
    if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    let response;
    try { response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body), signal }); }
    catch (error) { if (error.name === 'AbortError') throw error; throw new ApiError('连接失败，输入已保留，尚未确认是否写入。请先刷新核对，再重试或导出草稿。', 0); }
    let result;
    try { result = await response.json(); } catch { throw new ApiError('服务返回格式异常，未确认保存成功', response.status); }
    if (!response.ok) throw new ApiError(result.error || '请求失败，输入已保留', response.status);
    const next = response.headers.get('X-Nico-Revision');
    if (next && (revision == null || Number(next) >= revision)) revision = Number(next);
    return result;
  }
  function upload(body, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${base}/api/media`);
      const token = getToken(); if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      if (revision == null) return reject(new ApiError('请先加载数据', 428));
      xhr.setRequestHeader('If-Match', String(revision));
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
      xhr.onerror = () => reject(new ApiError('上传结果未确认，文件选择与说明已保留；请先刷新核对再重试', 0));
      xhr.onload = () => {
        let result; try { result = JSON.parse(xhr.responseText); } catch { return reject(new ApiError('上传响应无效', xhr.status)); }
        if (xhr.status < 200 || xhr.status >= 300) return reject(new ApiError(result.error || '上传失败', xhr.status));
        const next = xhr.getResponseHeader('X-Nico-Revision'); if (next && Number(next) >= revision) revision = Number(next);
        resolve(result);
      };
      xhr.send(body);
    });
  }
  async function mediaBlob(id, variant, signal) {
    const token = getToken();
    try {
      const res = await fetch(`${base}/api/media/${encodeURIComponent(id)}/content/${variant}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal });
      if (!res.ok) throw new ApiError('素材暂不可用，请刷新处理状态或选择原片', res.status);
      return URL.createObjectURL(await res.blob());
    } catch (problem) {
      if (problem.name === 'AbortError' || problem instanceof ApiError) throw problem;
      throw new ApiError('连接中断，未能读取素材。请检查连接后重新打开。', 0);
    }
  }
  return { request, upload, mediaBlob, getRevision: () => revision };
}
