import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/services/api.js';
import { loadPublicSummary } from '../src/services/public-summary.js';
const memoryStorage = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key), values: () => [...data.values()] }; };
test('进入儿童会话替换家长凭据、清除草稿身份，旧事实响应失效',async()=>{
  const old=globalThis.fetch,storage=memoryStorage(),api=createApi('https://protocol.invalid',()=>'',{storage});let release;
  try{globalThis.fetch=async()=>new Response(JSON.stringify({authenticated:true,role:'owner',username:'protocol',accessToken:'a'.repeat(64),expiresAt:Date.now()+60000}));await api.authRequest('login',{});assert.ok(api.getDraftScope());globalThis.fetch=()=>new Promise(r=>{release=r;});const pending=api.request('/api/snapshot');globalThis.fetch=async()=>new Response(JSON.stringify({authenticated:true,role:'child',username:'protocol',accessToken:'b'.repeat(64),expiresAt:Date.now()+60000}));await api.authRequest('child',{viewId:'view'});assert.equal(api.getDraftScope(),null);assert.ok(!storage.values().join('').includes('a'.repeat(64)));release(new Response('{}'));await assert.rejects(pending,{name:'AbortError'});}finally{globalThis.fetch=old;}
});
test('有效云端会话可在同一标签页刷新后恢复，退出后不再恢复', async () => {
  const original = globalThis.fetch, storage = memoryStorage(), token = 'a'.repeat(64), expiresAt = Date.now() + 60000;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ authenticated: true, accessToken: token, expiresAt, password: 'never-store-this' }));
    const first = createApi('https://test.invalid', () => '', { storage });
    await first.authRequest('login', { username: 'admin', password: 'protocol-password' });
    globalThis.fetch = async (_url, options) => { assert.equal(options.headers.Authorization, `Bearer ${token}`); return new Response(JSON.stringify({ authenticated: true, expiresAt })); };
    const restored = createApi('https://test.invalid', () => '', { storage });
    await restored.authRequest('session');
    assert.ok(!storage.values().join('').includes('password'));
    globalThis.fetch = async (_url, options) => { assert.equal(options.headers.Authorization, `Bearer ${token}`); return new Response(JSON.stringify({ success: true })); };
    await restored.authRequest('logout', {});
    assert.equal(storage.values().length, 0);
    globalThis.fetch = async (_url, options) => { assert.equal(options.headers.Authorization, undefined); return new Response(JSON.stringify({ authenticated: false })); };
    await createApi('https://test.invalid', () => '', { storage }).authRequest('session');
  } finally { globalThis.fetch = original; }
});
test('已过期的缓存不能继续恢复，接口地址之间会话隔离', async () => {
  const original = globalThis.fetch, storage = memoryStorage(), token = 'b'.repeat(64); let now = 1000;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ authenticated: true, accessToken: token, expiresAt: 2000 }));
    await createApi('https://one.invalid', () => '', { storage, now: () => now }).authRequest('login', {});
    assert.ok(storage.values().join('').includes(token));
    globalThis.fetch = async (_url, options) => { assert.equal(options.headers.Authorization, undefined); return new Response(JSON.stringify({ authenticated: false })); };
    await createApi('https://two.invalid', () => '', { storage, now: () => now }).authRequest('session');
    now = 2001;
    await createApi('https://one.invalid', () => '', { storage, now: () => now }).authRequest('session');
    assert.equal(storage.values().length, 0);
  } finally { globalThis.fetch = original; }
});
test('旧素材请求的401不能清除后来建立的新登录', async () => {
  const original = globalThis.fetch, api = createApi('https://test.invalid'); let expired = 0;
  api.setOnUnauthorized(() => expired++);
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ accessToken: 'c'.repeat(64), expiresAt: Date.now() + 60000 }));
    await api.authRequest('login', {});
    let resolve;
    globalThis.fetch = () => new Promise(done => { resolve = done; });
    const old = api.mediaFile('protocol', 'poster');
    api.resetAuth();
    globalThis.fetch = async () => new Response(JSON.stringify({ accessToken: 'd'.repeat(64), expiresAt: Date.now() + 60000 }));
    await api.authRequest('login', {});
    resolve(new Response('', { status: 401 }));
    await assert.rejects(old, { name: 'AbortError' }); assert.equal(expired, 0);
  } finally { globalThis.fetch = original; }
});
test('公开摘要以实时 API 为准，故障不回退旧静态数据；独立静态模式可用', async () => {
  let staticReads = 0;
  const fetcher = async () => { staticReads++; return new Response(JSON.stringify({ swim: [], media: [] })); };
  const offline = { request: async () => { throw new Error('连接失败'); } };
  await assert.rejects(loadPublicSummary(offline, { live: true, base: '/Nico/', fetcher }), /连接失败/);
  assert.equal(staticReads, 0);
  const revoked = { publishedAt: '2026-10-21', swim: [], media: [] };
  assert.deepEqual(await loadPublicSummary({ request: async path => { assert.equal(path, '/api/public-summary'); return revoked; } }, { live: true, fetcher }), revoked);
  assert.deepEqual(await loadPublicSummary(null, { live: false, base: '/Nico/', fetcher }), { swim: [], media: [] });
  assert.equal(staticReads, 1);
});
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
test('退出后忽略旧会话响应且下次登录重置记录版本', async () => {
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

test('断网不会清除已登录会话；服务端撤销会清除缓存，公开请求不携带凭据或污染记录版本', async () => {
  const original = globalThis.fetch, storage = memoryStorage(), token = 'e'.repeat(64), base = 'https://protocol.invalid';
  try {
    const api = createApi(base, () => '', { storage });
    globalThis.fetch = async () => new Response(JSON.stringify({ accessToken: token, expiresAt: Date.now() + 60000 }));
    await api.authRequest('login', {});
    globalThis.fetch = async () => { throw new TypeError('network failure'); };
    await assert.rejects(api.authRequest('session')); assert.ok(storage.values().join('').includes(token));
    globalThis.fetch = async (_url, options) => { assert.equal(options.headers.Authorization, undefined); assert.equal(options.credentials, 'omit'); return new Response('{}', { headers: { 'X-Nico-Revision': '99' } }); };
    await api.request('/api/public-summary', { anonymous: true }); assert.equal(api.getRevision(), null);
    globalThis.fetch = async (_url, options) => { assert.equal(options.headers.Authorization, `Bearer ${token}`); return new Response(JSON.stringify({ authenticated: false })); };
    await api.authRequest('session'); assert.equal(storage.values().length, 0);
  } finally { globalThis.fetch = original; }
});

test('浏览器存储损坏或被禁用不阻断登录；本机 Cookie 模式不写入会话凭据', async () => {
  const original = globalThis.fetch;
  try {
    const storage = memoryStorage(); storage.setItem('nico.session.v1:https://protocol.invalid', 'invalid-json');
    createApi('https://protocol.invalid', () => '', { storage }); assert.equal(storage.values().length, 0);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    globalThis.fetch = async () => new Response(JSON.stringify({ authenticated: true, accessToken: 'f'.repeat(64), expiresAt: Date.now() + 60000 }));
    await createApi('https://protocol.invalid', () => '', { storage: blocked }).authRequest('login', {});
    await createApi('', () => '', { storage }).authRequest('login', {}); assert.equal(storage.values().length, 0);
  } finally { globalThis.fetch = original; }
});

test('草稿身份只来自当前已验证会话，退出/强制改密不授予草稿访问，后续旧引用失效', async () => {
  const original = globalThis.fetch, api = createApi('https://protocol.invalid');
  try {
    assert.equal(api.getDraftScope?.() ?? null, null);
    globalThis.fetch = async () => new Response(JSON.stringify({ authenticated: true, username: 'protocol-a', role: 'owner', accessToken: 'a'.repeat(64), expiresAt: Date.now() + 60000 }));
    await api.authRequest('login', {});
    assert.equal(api.getDraftScope?.()?.account, 'protocol-a');
    const old = api.getDraftScope();
    api.resetAuth(); assert.equal(api.getDraftScope(), null);
    globalThis.fetch = async () => new Response(JSON.stringify({ authenticated: true, username: 'protocol-b', role: 'owner', mustChangePassword: true }));
    await api.authRequest('session'); assert.equal(api.getDraftScope(), null);
    globalThis.fetch = async () => new Response(JSON.stringify({ authenticated: true, username: 'protocol-b', role: 'owner' }));
    await api.authRequest('session'); assert.equal(api.getDraftScope().account, 'protocol-b'); assert.notEqual(api.getDraftScope(), old);
  } finally { globalThis.fetch = original; }
});
