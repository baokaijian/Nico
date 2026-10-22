// No credentials and no mutation payloads: verify the publication boundary.
import { COLLECTIONS } from '../shared/domain.mjs';
const base = (process.argv[2] || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const results = [];
const expect = (label, actual, wanted) => results.push({ label, actual, ok: actual === wanted });
const session = await fetch(`${base}/api/auth/session`);
expect('会话查询可用', session.status, 200);
expect('访客未登录', (await session.json()).authenticated, false);
const summary = await fetch(`${base}/api/public-summary`);
expect('公开摘要可读', summary.status, 200);
const published = await summary.json();
for (const endpoint of ['/api/snapshot', ...COLLECTIONS.map(key => `/api/${key}`), '/api/skills-overview', '/api/goals/guest-probe/candidates', '/api/backup', '/api/public-preview', '/api/media/guest-probe/content/original']) {
  for (const method of ['GET', 'HEAD']) expect(`${method} ${endpoint}`, (await fetch(base + endpoint, { method })).status, 401);
}
for (const item of published.media || []) for (const url of [item.url, item.posterUrl].filter(Boolean)) {
  expect('授权公开素材可读', (await fetch(`${base}/api/public-media/${url.split('/').at(-1)}`, { method: 'HEAD' })).status, 200);
}
expect('未授权素材不可读', (await fetch(`${base}/api/public-media/guest-probe-unpublished.mp4`, { method: 'HEAD' })).status, 404);
for (const [method, endpoint] of [['POST', '/api/swim'], ['POST', '/api/trainings'], ['PUT', '/api/swim/guest-probe'], ['DELETE', '/api/swim/guest-probe']]) {
  expect(`${method} ${endpoint}`, (await fetch(base + endpoint, { method })).status, 401);
}
for (const key of ['skillDefinitions', 'skillAssessments', 'goals', 'milestones']) {
  expect(`匿名创建 ${key}`, (await fetch(`${base}/api/${key}`, { method: 'POST' })).status, 401);
  expect(`失效凭据读取 ${key}`, (await fetch(`${base}/api/${key}`, { headers: { Authorization: `Bearer ${'0'.repeat(64)}` } })).status, 401);
}
for (const key of ['skillAssessments', 'goals', 'milestones']) expect(`匿名确认 ${key}`, (await fetch(`${base}/api/${key}/guest-probe/confirm`, { method: 'POST' })).status, 401);
for (const item of results) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label} → ${item.actual}`);
if (results.some(item => !item.ok)) process.exitCode = 1;
else console.log(`访客权限校验通过：${results.length}项。`);
