import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { emptyState } from '../shared/domain.mjs';
import { createApp } from '../server/server.js';
import { createCloudHandler } from '../server/cloud-api.mjs';
import { openStore } from '../server/store.mjs';
const score = { date: '2000-01-01', distance: '50m', stroke: '自由泳', poolLength: '25m', time: '56.171', validityStatus: '未核验', recordType: '训练' };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZioAAAAASUVORK5CYII=', 'base64');
for (const runtime of ['local', 'cloud']) test(`${runtime}连续活动：成绩/上传幂等、上下文关联、部分失败、CAS与删除重试`, async t => {
  const token = 'f'.repeat(64), files = new Map(); let read, send, uploads, failUpload = false;
  if (runtime === 'local') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nico-activity-')), uploadDir = path.join(dir, 'uploads'); fs.writeFileSync(path.join(dir, 'seed.json'), JSON.stringify(emptyState()));
    const store = openStore({ filename: path.join(dir, 'state.sqlite'), seedPath: path.join(dir, 'seed.json'), backupDir: path.join(dir, 'backups') });
    const server = createApp({ store, uploadsDir: uploadDir, tokens: { owner: token }, processUploads: false }).listen(0, '127.0.0.1'); await once(server, 'listening');
    t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
    read = () => store.read(); uploads = () => fs.readdirSync(uploadDir).length;
    send = (url, method = 'GET', body, revision = read().revision, guest = false) => fetch(`http://127.0.0.1:${server.address().port}${url}`, { method, headers: { ...(!guest ? { Authorization: `Bearer ${token}` } : {}), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), 'If-Match': String(revision) }, ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }) });
  } else {
    let current = { data: emptyState(), revision: 1 };
    const handler = createCloudHandler({ origins: [], backend: { read: async () => structuredClone(current), session: async () => ({ username: 'protocol-parent', expires_at: '2100-01-01T00:00:00Z' }), account: async () => ({ must_change_password: false }), upload: async (name, bytes) => { if (failUpload) throw Error('protocol upload unavailable'); files.set(name, bytes); }, removeFile: async name => files.delete(name), save: async (revision, data) => { if (revision !== current.revision) throw Object.assign(Error('protocol conflict'), { status: 409 }); current = { data: structuredClone(data), revision: revision + 1 }; return current.revision; } } });
    read = () => structuredClone(current); uploads = () => files.size;
    send = (url, method = 'GET', body, revision = read().revision, guest = false) => handler(new Request(`https://protocol.invalid/nico-api${url}`, { method, headers: { ...(!guest ? { Authorization: `Bearer ${token}` } : {}), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), 'If-Match': String(revision) }, ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }) }));
  }
  const uploadForm = (trainingId, requestId = 'protocol-media-request', bytes = png) => { const form = new FormData(); for (const [key, value] of Object.entries({ date: '2000-01-01', title: '协议活动影像', recordId: trainingId, clientRequestId: requestId })) form.append(key, value); form.append('file', new Blob([bytes], { type: 'image/png' }), 'protocol.png'); return form; };
  const trainingResponse = await send('/api/trainings', 'POST', { date: '2000-01-01', entryMode: '快速', totalMeters: 100, clientRequestId: 'protocol-training-request' }); assert.equal(trainingResponse.status, 201); const training = await trainingResponse.json();
  const input = { ...score, trainingId: training.id, clientRequestId: 'protocol-score-request' }, base = read().revision;
  const savedResponse = await send('/api/swim', 'POST', input); const saved = await savedResponse.json(); assert.equal(savedResponse.status, 201, saved.error); assert.equal(saved.trainingId, training.id); assert.equal(saved.timeMs, 56171); assert.equal(saved.validityStatus, '未核验');
  const retry = await send('/api/swim', 'POST', input, base); assert.equal(retry.status, 200); assert.equal((await retry.json()).id, saved.id); assert.equal(read().data.swim.length, 1);
  assert.equal((await send('/api/swim', 'POST', { ...input, time: '55' })).status, 409);
  assert.equal((await send('/api/swim', 'POST', { ...score, trainingId: 'missing' })).status, 400);
  assert.equal((await send('/api/swim', 'POST', { ...score, clientRequestId: 'another-score-request' }, 0)).status, 409);
  const before = read(); assert.equal((await send('/api/media', 'POST', uploadForm('missing'))).status, 400); assert.equal(uploads(), 0); assert.deepEqual(read(), before);
  if (runtime === 'cloud') { failUpload = true; assert.equal((await send('/api/media', 'POST', uploadForm(training.id))).status, 500); assert.equal(read().data.trainings.length, 1); assert.equal(read().data.media.length, 0); failUpload = false; }
  const mediaBase = read().revision, mediaResponse = await send('/api/media', 'POST', uploadForm(training.id)); const media = await mediaResponse.json(); assert.equal(mediaResponse.status, 201, media.error); assert.equal(media.recordId, training.id);
  const mediaRetry = await send('/api/media', 'POST', uploadForm(training.id), mediaBase); assert.equal(mediaRetry.status, 200); assert.equal((await mediaRetry.json()).id, media.id); assert.equal(uploads(), 1); assert.equal(read().data.media.length, 1);
  assert.equal((await send('/api/media', 'POST', uploadForm(training.id, 'protocol-media-request', Buffer.concat([png, Buffer.from([1])])))).status, 409); assert.equal(uploads(), 1);
  assert.equal((await send('/api/media', 'POST', uploadForm(training.id), undefined, true)).status, 401);
  assert.equal((await send(`/api/swim/${saved.id}`, 'DELETE')).status, 200); assert.equal((await send('/api/swim', 'POST', input)).status, 409);
  assert.equal((await send(`/api/media/${media.id}`, 'DELETE')).status, 200); assert.equal((await send('/api/media', 'POST', uploadForm(training.id))).status, 409); assert.equal(uploads(), 1, '已保存原片保留，重试临时文件清理');
  assert.equal(read().data.trainings.length, 1); assert.equal(read().data.trainings[0].totalMeters, 100);
});
