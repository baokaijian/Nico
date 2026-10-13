import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudHandler } from '../server/cloud-api.mjs';
import { emptyState } from '../shared/domain.mjs';
import { digestBytes, inspectPlayback, inspectPoster, validateVariantMetadata, VIDEO_PROCESSING_VERSION } from '../shared/media-variants.mjs';

// Container/HTTP protocol fixtures only: these bytes do not represent athlete video.
const box = (type, body) => { const h = Buffer.alloc(8); h.writeUInt32BE(body.length + 8); h.write(type, 4); return Buffer.concat([h, body]); };
function playback() {
  const header = Buffer.alloc(20); header.writeUInt32BE(1000, 12); header.writeUInt32BE(1000, 16);
  const sample = Buffer.alloc(78); sample.writeUInt16BE(320, 24); sample.writeUInt16BE(180, 26);
  const descriptions = Buffer.alloc(8); descriptions.writeUInt32BE(1, 4);
  const stsd = box('stsd', Buffer.concat([descriptions, box('avc1', Buffer.concat([sample, box('avcC', Buffer.from([1, 66, 0, 30]))]))]));
  const track = box('trak', box('mdia', box('minf', box('stbl', stsd))));
  return Buffer.concat([box('ftyp', Buffer.from('isom0000isom')), box('moov', Buffer.concat([box('mvhd', header), track])), box('mdat', Buffer.from([0]))]);
}
function poster() {
  const b = Buffer.alloc(25); b.set([255, 216, 255, 192, 0, 17, 8]); b.writeUInt16BE(180, 7); b.writeUInt16BE(320, 9); b[23] = 255; b[24] = 217; return b;
}
const original = Buffer.from('Fixed original protocol bytes; not athlete video');
async function harness() {
  let current = { data: emptyState(), revision: 1 }, failUpload = '', failSave = false;
  current.data.media = [{ id: 'protocol-media', date: '2000-01-01', title: '隔离视频容器协议，不是真实影像', type: 'video', url: '/uploads/original.mp4' }];
  const files = new Map([['original.mp4', original]]), backups = [], removed = [];
  const backend = {
    read: async () => structuredClone(current), session: async () => ({ username: 'protocol-only', expires_at: '2099-01-01T00:00:00Z' }), account: async () => ({ username: 'protocol-only', must_change_password: false }),
    save: async (expected, data) => { if (failSave || expected !== current.revision) throw Object.assign(new Error('协议冲突'), { status: 409 }); backups.push(structuredClone(current)); current = { data, revision: expected + 1 }; return current.revision; },
    download: async name => new Response(files.get(name) || null, { status: files.has(name) ? 200 : 404 }),
    upload: async (name, bytes) => { if (failUpload && name.endsWith(failUpload)) throw new Error('隔离上传失败'); if (files.has(name)) throw new Error('禁止覆盖'); files.set(name, Buffer.from(bytes)); },
    removeFile: async name => { removed.push(name); files.delete(name); },
  };
  const handler = createCloudHandler({ backend, origins: ['https://protocol.invalid'] });
  const request = (path, body, { authorized = true, revision = current.revision, method = 'POST' } = {}) => handler(new Request('https://protocol.invalid/nico-api' + path, { method, headers: { Origin: 'https://protocol.invalid', 'If-Match': String(revision), ...(authorized ? { Authorization: `Bearer ${'1'.repeat(64)}` } : {}), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body instanceof FormData ? body : JSON.stringify(body) }));
  const metadata = { duration: 1, originalCodec: 'hevc', processingVersion: VIDEO_PROCESSING_VERSION, sourceSha256: await digestBytes(original) };
  const form = (extra = {}) => { const b = new FormData(); b.append('sourceUrl', '/uploads/original.mp4'); b.append('metadata', JSON.stringify({ ...metadata, ...extra })); b.append('playback', new Blob([playback()], { type: 'video/mp4' }), 'playback.mp4'); b.append('poster', new Blob([poster()], { type: 'image/jpeg' }), 'poster.jpg'); return b; };
  return { request, form, metadata, files, backups, removed, state: () => current, fail: ({ upload = '', save = false }) => { failUpload = upload; failSave = save; } };
}
test('兼容文件格式要求加载优化、H264轨道、尺寸、有效时长与JPEG封面', () => {
  const p = playback(); assert.deepEqual(inspectPlayback(p), { duration: 1, width: 320, height: 180, playbackCodec: 'h264' }); assert.deepEqual(inspectPoster(poster()), { width: 320, height: 180 });
  for (const bytes of [p.subarray(0, 25), Buffer.from('not MP4'), Buffer.concat([p, Buffer.from([1])])]) assert.throws(() => inspectPlayback(bytes));
  const badCodec = Buffer.from(p); badCodec.write('hev1', badCodec.indexOf('avc1')); assert.throws(() => inspectPlayback(badCodec));
  const badDimensions = Buffer.from(p); badDimensions.writeUInt16BE(2000, badDimensions.indexOf('avc1') + 4 + 24); assert.throws(() => inspectPlayback(badDimensions));
  assert.throws(() => inspectPoster(Buffer.from('not JPEG')));
  assert.throws(() => validateVariantMetadata({ duration: 100, originalCodec: 'hevc', processingVersion: VIDEO_PROCESSING_VERSION, sourceSha256: 'a'.repeat(64) }, inspectPlayback(p)));
});
test('副本保存保留原片、说明和公开范围，真实来源哈希不匹配与匿名请求均被拒绝', async () => {
  const h = await harness(), before = structuredClone(h.state());
  const endpoint = '/api/media/protocol-media/variants';
  assert.equal((await h.request(endpoint, h.form(), { authorized: false })).status, 401);
  assert.equal((await h.request(endpoint, h.form({ sourceSha256: 'a'.repeat(64) }))).status, 400);
  assert.equal((await h.request(endpoint, h.form({ originalCodec: ['hevc'] }))).status, 400);
  assert.deepEqual(h.state(), before); assert.equal(h.files.size, 1);
  const badForm = h.form(); badForm.append('file', new Blob(['extra'])); assert.equal((await h.request(endpoint, badForm)).status, 400);
  const response = await h.request(endpoint, h.form()); assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.processingStatus, '已处理'); assert.equal(result.id, 'protocol-media'); assert.equal(result.url, '/uploads/original.mp4'); assert.equal(result.title, before.data.media[0].title);
  assert.deepEqual(h.files.get('original.mp4'), original); assert.equal(h.files.size, 3); assert.equal(h.backups.length, 1); assert.deepEqual(h.state().data.publishing, before.data.publishing);
  const completed = structuredClone(h.state());
  assert.equal((await h.request('/api/media/protocol-media/processing-failure', { sourceUrl: result.url, message: '另一次处理失败' })).status, 200);
  assert.deepEqual(h.state(), completed); assert.equal(h.removed.length, 0);
});
test('副本中途上传失败或CAS冲突不改记录，不清除旧文件', async () => {
  for (const failure of [{ upload: '.jpg' }, { save: true }]) {
    const h = await harness(), before = structuredClone(h.state()); h.fail(failure);
    const response = await h.request('/api/media/protocol-media/variants', h.form()); assert.equal(response.status, failure.save ? 409 : 500);
    assert.deepEqual(h.state(), before); assert.equal(h.files.size, 1); assert.deepEqual(h.files.get('original.mp4'), original); assert.ok(h.removed.every(name => name.startsWith('derived-')));
  }
});
test('失败状态可重试，第一次云端计划编辑也保留历史版本', async () => {
  const h = await harness();
  assert.equal((await h.request('/api/media/protocol-media/processing-failure', { sourceUrl: '/uploads/original.mp4', message: '设备未能处理；原片保留' })).status, 200);
  assert.equal(h.state().data.media[0].processingStatus, '处理未完成，原片保留');
  assert.equal((await h.request('/api/media/protocol-media/variants', h.form())).status, 200);
  const input = { title: '隔离计划版本协议', focus: '校验字段', startDate: '2000-01-01', endDate: '2000-01-31', status: '草稿', sessions: [] };
  const plan = await (await h.request('/api/plans', input)).json(); assert.equal(plan.version, 1); assert.equal(h.state().data.planHistory, undefined);
  assert.equal((await h.request(`/api/plans/${plan.id}`, { ...input, focus: '校验历史留存' }, { method: 'PUT' })).status, 200);
  assert.equal(h.state().data.plans[0].version, 2); assert.equal(h.state().data.planHistory[0].version, 1); assert.equal(h.state().data.planHistory[0].focus, input.focus);
});
