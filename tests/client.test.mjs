import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/services/api.js';
test('客户端不会把断网或错误响应当成成功，且发送表单原版本', async () => {
  const original = globalThis.fetch;
  const api = createApi('', () => 'test-only-token');
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ data: {}, revision: 4 }), { status: 200, headers: { 'X-Nico-Revision': '4', 'Content-Type': 'application/json' } });
    await api.request('/api/snapshot'); assert.equal(api.getRevision(), 4);
    globalThis.fetch = async (_url, options) => { assert.equal(options.headers['If-Match'], '2'); return new Response(JSON.stringify({ error: '版本冲突' }), { status: 409 }); };
    await assert.rejects(api.request('/api/swim/existing', { method: 'PUT', body: { time: '00:30.50' }, expectedRevision: 2 }), { status: 409 });
    globalThis.fetch = async () => { throw new TypeError('network failure'); };
    await assert.rejects(api.request('/api/swim', { method: 'POST', body: {} }), /输入已保留/);
    assert.equal(api.getRevision(), 4);
    globalThis.fetch = async () => new Response('<html>wrong response</html>', { status: 200 });
    await assert.rejects(api.request('/api/snapshot'), /返回格式异常/);
    globalThis.fetch = async () => { throw new TypeError('network failure'); };
    await assert.rejects(api.mediaBlob('protocol-only-media', 'poster'), /连接中断，未能读取素材/);
    globalThis.fetch = async () => { throw new DOMException('aborted', 'AbortError'); };
    await assert.rejects(api.mediaBlob('protocol-only-media', 'poster'), { name: 'AbortError' });
  } finally { globalThis.fetch = original; }
});
test('管理员凭据只保存在内存，退出后忽略旧会话响应且下次登录重置记录版本', async () => {
  const original = globalThis.fetch, api = createApi('https://test.invalid');
  try {
    globalThis.fetch = async (_url, options) => { assert.equal(options.credentials, 'omit'); assert.equal(options.headers['If-Match'], undefined); return new Response(JSON.stringify({ accessToken: 'test-session', expiresAt: Date.now() + 1000 })); };
    await api.authRequest('login', { username: 'admin', password: 'isolated-test-password' });
    let resolveResponse;
    globalThis.fetch = async (_url, options) => { assert.equal(options.headers.Authorization, 'Bearer test-session'); return new Promise(resolve => { resolveResponse = resolve; }); };
    const inFlight = api.request('/api/snapshot'); api.resetAuth();
    resolveResponse(new Response(JSON.stringify({ data: { private: true } }), { headers: { 'X-Nico-Revision': '8' } }));
    await assert.rejects(inFlight, { name: 'AbortError' }); assert.equal(api.getRevision(), null);
    globalThis.fetch = async (_url, options) => { assert.equal(options.headers.Authorization, undefined); return new Response(JSON.stringify({ data: {} }), { headers: { 'X-Nico-Revision': '2' } }); };
    await api.request('/api/public-summary'); assert.equal(api.getRevision(), 2);
  } finally { globalThis.fetch = original; }
});
test('游客只读请求被拒时不强制弹出登录层，只有带凭据的会话失效才重开', async () => {
  const original = globalThis.fetch;
  try {
    let prompted = 0;
    const guest = createApi('', () => '');
    guest.setOnUnauthorized(() => prompted++);
    globalThis.fetch = async () => new Response(JSON.stringify({ error: '请先登录管理员账号' }), { status: 401 });
    await assert.rejects(guest.request('/api/snapshot'), { status: 401 });
    assert.equal(prompted, 0, '未登录请求被拒不弹登录层');
    const member = createApi('', () => 'test-only-token');
    member.setOnUnauthorized(() => prompted++);
    await assert.rejects(member.request('/api/snapshot'), { status: 401 });
    assert.equal(prompted, 1, '会话失效仍然提示重新登录');
  } finally { globalThis.fetch = original; }
});
