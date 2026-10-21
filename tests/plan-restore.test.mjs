import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { emptyState, validateRecord } from '../shared/domain.mjs';
import { createApp } from '../server/server.js';
import { openStore } from '../server/store.mjs';
import { createCloudHandler } from '../server/cloud-api.mjs';

// Isolated protocol records only; no real athlete data or account is modified.
for (const runtime of ['local', 'cloud']) test(`${runtime}：恢复旧计划保留新版本，后续修改和冲突保护正常`, async t => {
  const initial = emptyState();
  const v1 = { ...validateRecord('plans', { title: '协议计划', startDate: '2000-01-01', endDate: '2000-01-02', focus: '原计划', status: '草稿', sessions: [] }), id: 'protocol-plan' };
  initial.plans = [v1];
  const backup = { format: 'nico-backup-v1', data: structuredClone(initial), revision: 1 };
  let read, send;
  const token = 'a'.repeat(64);
  if (runtime === 'local') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-plan-restore-'));
    fs.writeFileSync(path.join(dir, 'seed.json'), JSON.stringify(initial));
    const store = openStore({ filename: path.join(dir, 'state.sqlite'), seedPath: path.join(dir, 'seed.json'), backupDir: path.join(dir, 'backups') });
    const server = createApp({ store, uploadsDir: path.join(dir, 'uploads'), tokens: { owner: token }, processUploads: false }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
    read = () => store.read();
    send = (endpoint, method, body, revision) => fetch(`http://127.0.0.1:${server.address().port}${endpoint}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'If-Match': String(revision) }, body: JSON.stringify(body) });
  } else {
    let current = { data: structuredClone(initial), revision: 1 };
    const saved = [];
    const backend = {
      read: async () => structuredClone(current),
      session: async () => ({ username: 'protocol-admin', expires_at: '2100-01-01T00:00:00Z' }),
      account: async () => ({ username: 'protocol-admin', must_change_password: false }),
      save: async (expected, data) => { assert.equal(current.revision, expected); saved.push(structuredClone(current)); current = { data: structuredClone(data), revision: expected + 1 }; return current.revision; },
    };
    const handler = createCloudHandler({ backend, origins: [] });
    read = () => structuredClone(current);
    send = (endpoint, method, body, revision) => handler(new Request(`https://test.invalid/nico-api${endpoint}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'If-Match': String(revision) }, body: JSON.stringify(body) }));
    t.after(() => assert.ok(saved.length >= 3));
  }
  const update = await send('/api/plans/protocol-plan', 'PUT', { focus: '后来确认的安排' }, read().revision);
  assert.equal(update.status, 200); assert.equal((await update.json()).version, 2);
  const restore = await send('/api/restore', 'POST', backup, read().revision);
  assert.equal(restore.status, 200);
  const restored = read();
  assert.equal(restored.data.plans[0].focus, '原计划');
  assert.equal(restored.data.plans[0].version, 3);
  assert.ok(restored.data.planHistory.some(item => item.version === 1 && item.focus === '原计划'));
  assert.ok(restored.data.planHistory.some(item => item.version === 2 && item.focus === '后来确认的安排'));
  const next = await send('/api/plans/protocol-plan', 'PUT', { focus: '恢复后的新安排' }, restored.revision);
  assert.equal(next.status, 200); assert.equal((await next.json()).version, 4);
  const beforeConflict = read();
  assert.equal((await send('/api/restore', 'POST', backup, restored.revision)).status, 409);
  assert.deepEqual(read(), beforeConflict);
});
