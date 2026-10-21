import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAppView } from '../src/services/app-view.js';

test('登录身份独立于查看模式，查看模式仅取公开白名单，返回管理模式才读取档案', async () => {
  const session = { authenticated: true, role: 'owner' }, calls = [];
  const publicSnapshot = { swim: [{ id: 'published' }], media: [] }, privateSnapshot = { data: { swim: [{ id: 'private' }] }, revision: 3 };
  const api = { authRequest: async () => session, request: async (path, options) => { calls.push(path); if (path === '/api/public-summary') { assert.equal(options.anonymous, true); return publicSnapshot; } return privateSnapshot; } };
  const options = { adminCapable: true, base: '/Nico/' };
  assert.deepEqual(await loadAppView(api, { ...options, mode: 'view' }), { session, publicSnapshot });
  assert.deepEqual(calls, ['/api/public-summary']);
  assert.deepEqual(await loadAppView(api, { ...options, mode: 'manage' }), { session, privateSnapshot });
});

test('会话撤销立即清除身份，公开接口故障也不会继续显示完整档案；强制改密不能绕过', async () => {
  let verified = 'old'; const calls = [];
  const api = { authRequest: async () => ({ authenticated: false }), request: async path => { calls.push(path); assert.deepEqual(verified, { authenticated: false }); throw new Error('公开服务故障'); } };
  await assert.rejects(loadAppView(api, { mode: 'manage', adminCapable: true, onSession: value => { verified = value; } }), /公开服务故障/);
  assert.deepEqual(calls, ['/api/public-summary']);
  api.authRequest = async () => ({ authenticated: true, mustChangePassword: true });
  assert.deepEqual(await loadAppView(api, { mode: 'view', adminCapable: true }), { session: { authenticated: true, mustChangePassword: true } });
  assert.equal(calls.length, 1);
});
