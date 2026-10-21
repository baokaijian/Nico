import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { emptyState, normalizeState } from '../shared/domain.mjs';
import { upgradePerformanceState } from '../shared/performance.ts';
import { createCloudHandler } from '../server/cloud-api.mjs';
import { createApp } from '../server/server.js';
import { openStore } from '../server/store.mjs';

for (const runtime of ['local', 'cloud']) test(`${runtime}：毫秒CRUD、媒体关联及旧备份恢复保持精度与迁移版本`, async t => {
  const legacy = emptyState();
  legacy.swim = [{ id: 'protocol-legacy', date: '2000-01-01', distance: '50m', stroke: '自由泳', poolLength: '50m', time: '56.17', seconds: 56.17 }];
  legacy.media = [{ id: 'protocol-media', date: '2000-01-01', title: '隔离素材', type: 'video', url: '/uploads/protocol.mp4' }];
  const initial = upgradePerformanceState(legacy).data, token = 'e'.repeat(64);
  let read, send;
  if (runtime === 'local') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-ms-api-'));
    const seed = path.join(dir, 'seed.json'); fs.writeFileSync(seed, JSON.stringify(initial));
    const store = openStore({ filename: path.join(dir, 'state.sqlite'), seedPath: seed, backupDir: path.join(dir, 'backups') });
    const server = createApp({ store, uploadsDir: path.join(dir, 'uploads'), tokens: { owner: token }, processUploads: false }).listen(0, '127.0.0.1'); await once(server, 'listening');
    t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
    read = () => store.read();
    send = (route, method, body) => fetch(`http://127.0.0.1:${server.address().port}${route}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'If-Match': String(read().revision) }, body: JSON.stringify(body) });
  } else {
    let current = { data: initial, revision: 1 };
    const handler = createCloudHandler({ origins: [], backend: {
      read: async () => structuredClone(current), session: async () => ({ username: 'protocol-only', expires_at: '2100-01-01T00:00:00Z' }), account: async () => ({ must_change_password: false }),
      save: async (revision, data) => { assert.equal(revision, current.revision); current = { data, revision: revision + 1 }; return current.revision; },
    } });
    read = () => structuredClone(current);
    send = (route, method, body) => handler(new Request(`https://protocol.invalid/nico-api${route}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'If-Match': String(current.revision) }, body: JSON.stringify(body) }));
  }
  const response = await send('/api/swim', 'POST', { date: '2000-01-02', distance: '50m', stroke: '自由泳', poolLength: '50m', time: '56.171', validityStatus: '有效' });
  assert.equal(response.status, 201); const score = await response.json(); assert.equal(score.timeMs, 56171);
  const edited = await send(`/api/swim/${score.id}`, 'PUT', { notes: '仅改备注' }); assert.equal(edited.status, 200); assert.equal((await edited.json()).timeMs, 56171);
  assert.equal((await send('/api/media/protocol-media', 'PUT', { recordId: score.id })).status, 200);
  assert.equal(read().data.media[0].recordId, score.id);
  assert.equal((await send(`/api/swim/${score.id}`, 'DELETE', {})).status, 200);
  const trash = read().data.trash.find(item => item.record.id === score.id);
  assert.equal(trash.record.timeMs, 56171);
  assert.equal((await send(`/api/trash/${trash.id}/restore`, 'POST', {})).status, 200);
  assert.equal(read().data.swim.find(item => item.id === score.id).timeMs, 56171);
  assert.equal((await send('/api/restore', 'POST', { format: 'nico-backup-v1', data: legacy })).status, 200);
  const restored = read().data; normalizeState(restored);
  assert.equal(restored.performanceSchemaVersion, 1); assert.equal(restored.swim[0].timeMs, 56170);
  assert.equal(restored.swim[0].validityStatus, '未核验');
  assert.equal(restored.trash.find(item => item.record.id === score.id).record.timeMs, 56171, '较新记录留在回收站，未被旧备份丢弃');
  const before = read(); assert.equal((await send('/api/swim', 'POST', { date: '2000-01-02', distance: '50m', stroke: '自由泳', poolLength: '50m', time: '56.171', timeMs: -1 })).status, 400); assert.deepEqual(read(), before);
});
