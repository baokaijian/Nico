import {boundedMediaBlob} from './bounded-media.mjs';
import { createSessionPersistence } from './session.js';
import { createHealth } from '../../shared/runtime-health.mjs';
export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export function createApi(base = import.meta.env.VITE_API_URL || '', getToken = () => '', options = {}) {
  const persistence = createSessionPersistence(base, options);
  const health = createHealth();
  let revision = null, csrf = '', accessToken = persistence.load()?.accessToken || '', generation = 0, onUnauthorized = () => {}, draftIdentity = null, childIdentity=null;
  const resetAuth = () => { generation++; revision = null; csrf = ''; accessToken = ''; draftIdentity = null; childIdentity=null; persistence.clear(); health.reset(); };
  const unauthorized = reason => { resetAuth(); onUnauthorized(reason); };
  const credential = () => accessToken || getToken();
  const credentials = base ? 'omit' : 'same-origin';
  async function observedFetch(path,init) {
    const epoch=generation,start=Date.now();
    try{const result=await fetch(`${base}${path}`,init);if(epoch===generation)health.record(path,init?.method||'GET',result.status,Date.now()-start);return result;}
    catch(error){if(epoch===generation&&error.name!=='AbortError')health.record(path,init?.method||'GET',0,Date.now()-start);throw error;}
  }
  async function request(path, { method = 'GET', body, signal, expectedRevision, anonymous = false } = {}) {
    const started = generation;
    const headers = {};
    const token = anonymous ? '' : credential();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (method !== 'GET') {
      if (revision == null) throw new ApiError('请先加载数据再保存', 428);
      headers['If-Match'] = String(expectedRevision ?? revision);
      if (csrf) headers['X-CSRF-Token'] = csrf;
    }
    const multipart = body instanceof FormData;
    if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    let response;
    try { response = await observedFetch(path, { method, credentials: anonymous ? 'omit' : credentials, headers, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body), signal }); }
    catch (error) { if (error.name === 'AbortError') throw error; throw new ApiError('连接失败，输入已保留，尚未确认是否写入。请先刷新核对，再重试或导出草稿。', 0); }
    let result;
    try { result = await response.json(); } catch { throw new ApiError('服务返回格式异常，未确认保存成功', response.status); }
    if (started !== generation) throw new DOMException('登录状态已改变，已忽略旧会话响应', 'AbortError');
    // Public browsing remains available; only an authenticated request can signal a lost session.
    if (!response.ok) { if(!anonymous&&response.status===403&&childIdentity&&['/api/child-view','/api/child-reflections'].includes(path))unauthorized({scopeDenied:true}); if (!anonymous && response.status === 401 && (token || csrf)) unauthorized(); throw new ApiError(result.error || '请求失败，输入已保留', response.status); }
    const next = response.headers.get('X-Nico-Revision');
    if (!anonymous && next && (revision == null || Number(next) >= revision)) revision = Number(next);
    return result;
  }
  function upload(body, onProgress, { expectedRevision } = {}) {
    const started = generation, start=Date.now();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${base}/api/media`);
      xhr.withCredentials = !base;
      const token = credential(); if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf);
      if (revision == null) return reject(new ApiError('请先加载数据', 428));
      xhr.setRequestHeader('If-Match', String(expectedRevision ?? revision));
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
      xhr.onerror = () => { if(started===generation)health.record('/api/media','POST',0,Date.now()-start);reject(new ApiError('上传结果未确认，文件选择与说明已保留；请先刷新核对再重试', 0)); };
      xhr.onload = () => {
        if (started !== generation) return reject(new DOMException('登录状态已改变，已忽略旧上传响应', 'AbortError'));
        health.record('/api/media','POST',xhr.status,Date.now()-start);
        let result; try { result = JSON.parse(xhr.responseText); } catch { return reject(new ApiError('上传响应无效', xhr.status)); }
        if (xhr.status < 200 || xhr.status >= 300) { if (xhr.status === 401 && (token || csrf)) unauthorized(); return reject(new ApiError(result.error || '上传失败', xhr.status)); }
        const next = xhr.getResponseHeader('X-Nico-Revision'); if (next && Number(next) >= revision) revision = Number(next);
        resolve(result);
      };
      xhr.send(body);
    });
  }
  async function mediaFile(id, variant, signal, child=false, maxBytes=null) {
    const started = generation;
    const token = credential();
    try {
      const res = await observedFetch(child?`/api/child-media/${encodeURIComponent(id)}`:`/api/media/${encodeURIComponent(id)}/content/${variant}`, { credentials, headers: token ? { Authorization: `Bearer ${token}` } : {}, signal });
      if (started !== generation) throw new DOMException('登录状态已改变，已忽略旧素材响应', 'AbortError');
      if(child&&res.status===403&&childIdentity)unauthorized({scopeDenied:true});
      if (res.status === 401 && (token || csrf)) unauthorized();
      if (!res.ok) throw new ApiError('素材暂不可用，请刷新处理状态或选择原片', res.status);
      const blob = maxBytes?await boundedMediaBlob(res,maxBytes,signal):await res.blob();
      if (started !== generation) throw new DOMException('登录状态已改变，已忽略旧素材响应', 'AbortError');
      return blob;
    } catch (problem) {
      if(problem.status===413)throw new ApiError(problem.message,413);
      if (problem.name === 'AbortError' || problem instanceof ApiError) throw problem;
      throw new ApiError('连接中断，未能读取素材。请检查连接后重新打开。', 0);
    }
  }
  const mediaBlob = async (id, variant, signal) => URL.createObjectURL(await mediaFile(id, variant, signal));
  async function authRequest(action, body, { signal } = {}) {
    const started = generation;
    const token = credential();
    const response = await observedFetch(`/api/auth/${action}`, { method: body === undefined ? 'GET' : 'POST', signal, credentials, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    let result; try { result = await response.json(); } catch { throw new ApiError('登录服务暂不可用，请稍后重试', response.status); }
    if (started !== generation) throw new DOMException('登录状态已改变', 'AbortError');
    if (!response.ok) { if (action === 'session' && response.status === 401) resetAuth(); throw new ApiError(result.error || '账号操作失败', response.status); }
    if (action === 'logout' || (action === 'session' && !result.authenticated)) resetAuth();
    if (result.accessToken || ['login','setup','child'].includes(action)) { generation++; revision = null; if(result.accessToken)accessToken = result.accessToken; health.reset(); }
    if (result.csrf) csrf = result.csrf;
    if (accessToken && result.expiresAt) persistence.save(accessToken, result.expiresAt);
    if (result.authenticated && !result.mustChangePassword && result.username && ['owner', 'coach'].includes(result.role)) {
      if (draftIdentity?.account !== result.username || draftIdentity.epoch !== generation) draftIdentity = { backend: base || globalThis.location?.origin || 'local', account: result.username, athlete: 'nico', epoch: generation };
    } else if (action === 'session' || action === 'login' || result.role==='child') draftIdentity = null;
    if(result.authenticated&&result.role==='child'&&!result.mustChangePassword&&result.username&&result.expiresAt){if(childIdentity?.account!==result.username||childIdentity.epoch!==generation||childIdentity.expiresAt!==result.expiresAt)childIdentity={role:'child',backend:base||globalThis.location?.origin||'local',account:result.username,expiresAt:result.expiresAt,epoch:generation};}else if(result.authenticated||action==='session'||action==='logout')childIdentity=null;
    return result;
  }
  return { health, childPhotoBlob:async(id,signal)=>URL.createObjectURL(await mediaFile(id,'original',signal,true)), cloudMode: /\/functions\/v1\/nico-api\/?$/.test(base), usesCookieSession: !base, request, upload, mediaBlob, mediaFile:(id,variant,signal,options={})=>mediaFile(id,variant,signal,false,options.maxBytes), authRequest, resetAuth, getDraftScope: () => draftIdentity, getChildScope:()=>childIdentity, getMode: persistence.loadMode, setMode: persistence.saveMode, setOnUnauthorized: handler => { onUnauthorized = handler; }, getRevision: () => revision,
    publicMediaUrl: url => base ? `${base}/api/public-media/${encodeURIComponent(url.split('/').pop())}` : `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}` };
}
