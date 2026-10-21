import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudHandler } from '../server/cloud-api.mjs';
import { normalizeState, publicSnapshot } from '../shared/domain.mjs';
import { passwordHash, digestHex } from '../shared/password.mjs';
import { raw } from './fixture.mjs';

test('云端：匿名只读授权摘要，完整档案强制会话；换临时密码、真实数据CRUD、冲突、素材范围、退出和过期', async () => {
  let current = { data: normalizeState(raw), revision: 8 }, time = Date.now();
  current.data.publishing = { swimIds: [raw.swim[0].id], mediaIds: [raw.media[0].id], confirmedBy: '隔离测试', confirmedAt: '2026-10-12', story: '' };
  let account = { username: 'admin', salt: 'test-only-salt', password_hash: await passwordHash('temporary-test-password', 'test-only-salt'), must_change_password: true };
  const sessions = new Map(), attempts = new Map(), backups = [];
  const backend = {
    read: async () => structuredClone(current), account: async name => name === account.username ? structuredClone(account) : null,
    session: async hash => sessions.get(hash), createSession: async value => sessions.set(value.token_hash, value), deleteSession: async hash => sessions.delete(hash),
    loginAttempt: async key => { const n = (attempts.get(key) || 0) + 1; attempts.set(key, n); return n; },
    changePassword: async (_name, previous, salt, hash) => { if (previous !== account.password_hash) return false; account = { ...account, salt, password_hash: hash, must_change_password: false }; sessions.clear(); return true; },
    save: async (expected, data) => { if (current.revision !== expected) throw Object.assign(new Error('冲突'), { status: 409 }); backups.push(structuredClone(current)); current = { data, revision: expected + 1 }; return current.revision; },
    download: async () => new Response('isolated-range-protocol-bytes', { headers: { 'Content-Type': 'video/mp4' } }),
  };
  const handler = createCloudHandler({ backend, origins: ['https://baokaijian.github.io'], now: () => time });
  const request = (endpoint, method = 'GET', body, token = '', revision = current.revision) => handler(new Request('https://test.invalid/nico-api' + endpoint, { method, headers: { Origin: 'https://baokaijian.github.io', 'Content-Type': 'application/json', 'If-Match': String(revision), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }));
  const before = structuredClone(current);
  assert.deepEqual(await (await request('/api/public-summary')).json(), publicSnapshot(current.data));
  for (const endpoint of ['/api/snapshot', '/api/growth', `/api/media/${raw.media[0].id}/content/original`]) assert.equal((await request(endpoint)).status, 401, endpoint);
  assert.equal((await request('/api/backup')).status, 401);
  for (const method of ['POST', 'PUT', 'DELETE']) assert.equal((await request('/api/swim', method, {})).status, 401);
  assert.deepEqual(current, before);
  assert.equal((await request('/api/public-media/not-selected.mp4')).status, 404);
  assert.equal((await request('/api/auth/login', 'POST', { username: 'admin', password: 'wrong' })).status, 401);
  let token = (await (await request('/api/auth/login', 'POST', { username: 'admin', password: 'temporary-test-password' })).json()).accessToken;
  assert.ok(token); assert.equal((await request('/api/snapshot', 'GET', undefined, token)).status, 403);
  const changed = await request('/api/auth/password', 'POST', { currentPassword: 'temporary-test-password', password: 'new-test-only-password' }, token); assert.equal(changed.status, 200);
  const old = token; token = (await changed.json()).accessToken;
  assert.equal((await request('/api/snapshot', 'GET', undefined, old)).status, 401, '旧令牌不能读取档案');
  assert.equal((await request('/api/swim', 'POST', {}, old)).status, 401, '旧令牌不能录入');
  const snapshot = await request('/api/snapshot', 'GET', undefined, token); assert.equal(snapshot.status, 200); assert.equal((await snapshot.json()).role, 'owner');
  const profile = await request('/api/profile', 'PUT', current.data.profile, token); assert.equal(profile.status, 200); assert.equal(backups.length, 1); assert.deepEqual(current.data, before.data);
  assert.equal((await request('/api/profile', 'PUT', current.data.profile, token, 8)).status, 409);
  assert.equal((await request('/api/swim', 'POST', { date: '2026-10-12', distance: '50m', stroke: '自由泳', poolLength: '50m', time: 'abc' }, token)).status, 400);
  assert.deepEqual(current.data, before.data);
  const original = structuredClone(current.data.swim[0]);
  assert.equal((await request(`/api/swim/${original.id}`, 'DELETE', undefined, token)).status, 200);
  assert.ok(!current.data.swim.some(item => item.id === original.id));
  const removed = current.data.trash.find(item => item.record.id === original.id);
  assert.deepEqual(removed.record, original); assert.equal(removed.deletedBy, 'admin'); assert.ok(removed.deletedAt);
  assert.equal((await request(`/api/trash/${removed.id}/restore`, 'POST', {}, token)).status, 200);
  assert.deepEqual(current.data.swim.find(item => item.id === original.id), original);
  assert.equal(current.data.trash.length, 0);
  assert.equal((await request('/api/auth/logout', 'POST', {}, token)).status, 200);
  assert.equal((await request('/api/snapshot', 'GET', undefined, token)).status, 401, '退出后档案不可读');
  assert.equal((await request('/api/swim', 'POST', {}, token)).status, 401, '退出后不能录入');
  token = (await (await request('/api/auth/login', 'POST', { username: 'admin', password: 'new-test-only-password' })).json()).accessToken;
  time += 3600001;
  assert.equal((await request('/api/snapshot', 'GET', undefined, token)).status, 401, '会话过期后档案不可读');
  assert.equal((await request('/api/swim', 'POST', {}, token)).status, 401, '会话过期后不能录入');
  assert.equal(await digestHex('test'), '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
});
test('云端：全部集合和原片需登录，GET/HEAD 均受保护，公开撤回立即生效', async () => {
  const current = { data: normalizeState(raw), revision: 3 };
  const item = current.data.media[0];
  item.playbackUrl = '/uploads/protocol-playback.mp4'; item.posterUrl = '/uploads/protocol-poster.jpg';
  current.data.publishing = { swimIds: [], mediaIds: [item.id], confirmedBy: '协议测试', confirmedAt: '2026-10-21' };
  const backend = { read: async () => structuredClone(current), session: async () => null, download: async () => new Response('isolated-bytes') };
  const handler = createCloudHandler({ backend, origins: ['https://baokaijian.github.io'] });
  const call = (path, method = 'GET') => handler(new Request('https://test.invalid/nico-api' + path, { method }));
  for (const key of Object.keys(current.data).filter(key => Array.isArray(current.data[key]))) {
    for (const method of ['GET', 'HEAD']) assert.equal((await call('/api/' + key, method)).status, 401);
  }
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/api/snapshot', '/api/backup', `/api/media/${item.id}/content/original`, `/api/media/${item.id}/content/playback`]) assert.equal((await call(path, method)).status, 401);
    assert.equal((await call('/api/public-media/protocol-playback.mp4', method)).status, 200);
    assert.equal((await call('/api/public-media/protocol-poster.jpg', method)).status, 200);
    assert.equal((await call('/api/public-media/' + item.url.split('/').at(-1), method)).status, 404, '公开播放副本不授权原件');
  }
  current.data.publishing.mediaIds = [];
  assert.equal((await call('/api/public-media/protocol-playback.mp4')).status, 404);
  assert.equal((await call('/api/public-media/protocol-poster.jpg', 'HEAD')).status, 404);
  assert.deepEqual((await (await call('/api/public-summary')).json()).media, []);
});
