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
