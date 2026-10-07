import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createPublicApp } from '../server/public-server.mjs';
import { validatePublicDirectory, validatePublicSummary } from '../shared/publication.mjs';
import { publicSnapshot, normalizeState } from '../shared/domain.mjs';
import { raw } from './fixture.mjs';
import { createApp, maintenanceMode } from '../server/server.js';

function fixture(t, basePath = '/Nico/') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-public-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, 'uploads'));
  fs.writeFileSync(path.join(directory, 'index.html'), '<!doctype html><title>只读入口协议测试</title>');
  fs.writeFileSync(path.join(directory, 'nico-build.json'), JSON.stringify({ schema: 1, mode: 'public', readOnly: true, basePath }));
  // Select existing input records; only HTTP-range bytes are a deterministic protocol fixture.
  const summary = publicSnapshot(normalizeState(raw), { swimIds: [raw.swim[0].id], mediaIds: [], confirmedBy: '协议测试', confirmedAt: '2026-10-07' });
  summary.media = [{ id: 'range-protocol-only', date: '2026-10-07', title: 'HTTP分段测试文件（不是实际录像）', type: 'video', url: '/uploads/range-protocol.mp4', posterUrl: '', duration: null }];
  fs.writeFileSync(path.join(directory, 'public-summary.json'), JSON.stringify(summary));
  fs.writeFileSync(path.join(directory, 'uploads/range-protocol.mp4'), '0123456789');
  return directory;
}
test('公网匿名读取展示包和素材，所有写方法即使带管理密钥也拒绝', async t => {
  const directory = fixture(t), before = fs.readFileSync(path.join(directory, 'public-summary.json'));
  const server = createPublicApp({ webDir: directory }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base + '/Nico/')).status, 200);
  const summary = await (await fetch(base + '/Nico/public-summary.json')).json();
  assert.equal(summary.swim[0].id, raw.swim[0].id);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    for (const endpoint of ['/Nico/', '/Nico/public-summary.json', '/api/swim', '/api/media', '/api/restore', '/api/public-export']) {
      const response = await fetch(base + endpoint, { method, headers: { Authorization: 'Bearer owner-protocol-only', 'Content-Type': 'application/json', 'X-HTTP-Method-Override': 'GET' }, body: '{invalid-json' });
      assert.equal(response.status, 405, `${method} ${endpoint}`);
      assert.equal(response.headers.get('Allow'), 'GET, HEAD');
    }
  }
  for (const endpoint of ['/api/snapshot', '/api/backup', '/api/swim', '/Nico/data/original-input.json', '/Nico/server/db.json', '/Nico/.env', '/uploads/range-protocol.mp4']) assert.equal((await fetch(base + endpoint)).status, 404, endpoint);
  const response = await fetch(base + '/Nico/uploads/range-protocol.mp4', { headers: { Range: 'bytes=2-5' } });
  assert.equal(response.status, 206); assert.equal(response.headers.get('Content-Range'), 'bytes 2-5/10'); assert.equal(await response.text(), '2345');
  assert.equal((await fetch(base + '/Nico/uploads/range-protocol.mp4', { method: 'HEAD' })).status, 200);
  assert.deepEqual(fs.readFileSync(path.join(directory, 'public-summary.json')), before);
  assert.deepEqual(fs.readdirSync(directory).sort(), ['index.html', 'nico-build.json', 'public-summary.json', 'uploads']);
});
test('公网启动拒绝私有构建、夹带数据、未选择素材、路径逃逸和符号链接', t => {
  const directory = fixture(t), manifestPath = path.join(directory, 'nico-build.json');
  const valid = fs.readFileSync(manifestPath);
  fs.writeFileSync(manifestPath, JSON.stringify({ schema: 1, mode: 'private', readOnly: false, basePath: '/Nico/' }));
  assert.throws(() => createPublicApp({ webDir: directory })); fs.writeFileSync(manifestPath, valid);
  for (const file of ['db.json', 'uploads/unselected.mp4']) {
    fs.writeFileSync(path.join(directory, file), 'protocol'); assert.throws(() => validatePublicDirectory(directory)); fs.unlinkSync(path.join(directory, file));
  }
  fs.symlinkSync(path.join(directory, 'public-summary.json'), path.join(directory, 'uploads/linked.json'));
  assert.throws(() => validatePublicDirectory(directory)); fs.unlinkSync(path.join(directory, 'uploads/linked.json'));
  const summary = JSON.parse(fs.readFileSync(path.join(directory, 'public-summary.json')));
  assert.throws(() => validatePublicSummary({ ...summary, nutrition: [] }));
  assert.throws(() => validatePublicSummary({ ...summary, swim: [{ ...summary.swim[0], notes: '不属于公开字段' }] }));
  assert.throws(() => validatePublicSummary({ ...summary, media: [{ ...summary.media[0], url: '/uploads/../../data/private.json' }] }));
  assert.throws(() => validatePublicSummary({ ...summary, publishedAt: null }));
  assert.throws(() => validatePublicSummary({ ...summary, swim: [{ ...summary.swim[0], seconds: summary.swim[0].seconds + 1 }] }));
  fs.unlinkSync(path.join(directory, 'uploads/range-protocol.mp4'));
  assert.throws(() => createPublicApp({ webDir: directory }));
});
test('公网入口兼容根路径部署且不会重定向循环', async t => {
  const directory = fixture(t, '/');
  const server = createPublicApp({ webDir: directory }).listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/`)).status, 200);
});
test('私有维护服务误设远程监听也强制只读，环境变量不能关闭保护', () => {
  for (const host of ['0.0.0.0', '::', '192.168.1.10', 'public.example']) assert.deepEqual(maintenanceMode(host, { NICO_AUTH_REQUIRED: 'false', NICO_READ_ONLY: 'false' }), { authRequired: true, readOnly: true });
  for (const host of ['127.0.0.1', 'localhost', '::1']) assert.deepEqual(maintenanceMode(host, {}), { authRequired: false, readOnly: false });
  assert.equal(maintenanceMode('127.0.0.1', { NICO_READ_ONLY: 'true' }).readOnly, true);
});
test('只读维护入口在解析正文与上传前拒绝所有写入，事实库保持不变', async t => {
  const directory = fixture(t), data = normalizeState(raw), before = JSON.stringify(data);
  let writes = 0;
  const token = 'readonly-protocol-only-owner-credential';
  const server = createApp({ store: { read: () => ({ data, revision: 1 }), change: () => { writes++; throw new Error('禁止触及写入'); } }, uploadsDir: path.join(directory, 'private-uploads'), readOnly: true, authRequired: true, tokens: { owner: token }, processUploads: false }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) for (const endpoint of ['/api/swim', '/api/media', '/api/restore', '/api/profile', '/api/public-export']) {
    const response = await fetch(base + endpoint, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{invalid-json' });
    assert.equal(response.status, 405);
  }
  const body = new FormData(); body.append('file', new Blob(['仅用于隔离协议测试']), 'test.mp4');
  assert.equal((await fetch(base + '/api/media', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body })).status, 405);
  assert.equal(writes, 0); assert.equal(JSON.stringify(data), before); assert.deepEqual(fs.readdirSync(path.join(directory, 'private-uploads')), []);
});
