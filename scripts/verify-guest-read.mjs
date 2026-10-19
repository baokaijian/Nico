// Guest browsing check: no cookie, no Authorization header, no body that could be stored.
// Reads must answer 200; every write, export and identity action must still answer 401.
import { COLLECTIONS } from '../shared/domain.mjs';
const base = (process.argv[2] || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const call = async (path, method = 'GET') => {
  const response = await fetch(`${base}${path}`, { method, headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify({}) });
  let body = null;
  try { body = await response.json(); } catch { /* binary or empty responses are fine here */ }
  return { path, method, status: response.status, body };
};
const results = [];
const expect = (label, actual, wanted, detail = '') => results.push({ label, actual, wanted, ok: actual === wanted, detail });
const session = await call('/api/auth/session');
expect('会话查询 /api/auth/session', session.status, 200);
expect('会话查询返回未登录', session.body?.authenticated, false);
const snapshot = await call('/api/snapshot');
expect('快照 /api/snapshot', snapshot.status, 200);
expect('快照角色为只读 viewer', snapshot.body?.role, 'viewer');
const data = snapshot.body?.data || {};
console.log(`已录入条数：${COLLECTIONS.map(key => `${key} ${(data[key] || []).length}`).join(' · ')}`);
for (const key of COLLECTIONS) expect(`列表 /api/${key}`, (await call(`/api/${key}`)).status, 200);
const firstMedia = (data.media || [])[0];
if (firstMedia) expect('素材内容 /api/media/:id/content/original', (await call(`/api/media/${firstMedia.id}/content/original`)).status !== 401, true, '不要求登录即可读取（404 表示变体未生成）');
for (const [method, path] of [['POST', '/api/swim'], ['POST', '/api/trainings'], ['PUT', '/api/swim/guest-probe-id'], ['DELETE', '/api/swim/guest-probe-id']]) expect(`写操作 ${method} ${path}`, (await call(path, method)).status, 401);
expect('导出备份 /api/backup', (await call('/api/backup')).status, 401);
expect('发布预览 /api/public-preview', (await call('/api/public-preview')).status, 401);
for (const item of results) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label} → ${item.actual}${item.detail ? `（${item.detail}）` : ''}`);
const failed = results.filter(item => !item.ok);
if (failed.length) { console.error(`游客只读校验失败：${failed.length}项不符合预期。`); process.exit(1); }
console.log(`游客只读校验通过：${results.length}项，访问地址 ${base}。`);
