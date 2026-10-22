import { activityRelations } from '../shared/activity-records.mjs';
import { growthCollection, growthId } from '../shared/growth-model.ts';
import { saveGrowth, actGrowth, deleteGrowth, restoreGrowth, retainGrowthHistory, goalCandidates, skillTimeline } from '../shared/growth-records.mjs';
import { derivePrdState, upgradePrdState } from '../shared/prd.mjs';
import { upgradePerformanceState } from '../shared/performance.ts';
import { trainingCollection, creationRequest, creationReplay, stampTraining, trainingRelations } from '../shared/training-records.mjs';
import { COLLECTIONS, LEGACY_COLLECTIONS, normalizeState, validateRecord, validDate, publicSnapshot, analysis } from '../shared/domain.mjs';
import { syncPlanDraft, commitPlanUpdate, retainPlanHistory } from '../shared/plan-engine.mjs';
import { randomHex, digestHex, passwordHash, constantEqual } from '../shared/password.mjs';
import { preserveDeletedRecords } from '../shared/deletion.mjs';
import { digestBytes, inspectPlayback, inspectPoster, validateVariantMetadata, MEDIA_MAX_BYTES, POSTER_MAX_BYTES } from '../shared/media-variants.mjs';

const fail = (status, message) => Object.assign(new Error(message), { status });
const validate = (...args) => { try { return validateRecord(...args); } catch (error) { throw fail(400, error.message); } };
const safeFile = value => /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(value);
const fileFor = url => typeof url === 'string' && /^\/uploads\/[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(url) ? url.slice(9) : null;
const publicFiles = data => publicSnapshot(data).media.flatMap(item => [fileFor(item.url), fileFor(item.posterUrl)].filter(Boolean));
const privateFiles = data => data.media.flatMap(item => [fileFor(item.url), fileFor(item.playbackUrl), fileFor(item.posterUrl)].filter(Boolean));
function relations(collection, record, data, previous = null) {
  activityRelations(collection, record, data, previous);
  if (collection === 'plans') {
    const ids = new Set(COLLECTIONS.flatMap(key => data[key].map(r => r.id)));
    if ((record.sourceIds || []).some(id => !ids.has(id))) throw fail(400, '计划引用的来源记录不存在');
    if (record.sourceVersion && record.sourceVersion !== analysis(data).version) throw fail(409, '计划依据已经改变，请刷新后核对');
  }
  if (collection === 'annotations') {
    const media = data.media.find(m => m.id === record.mediaId);
    if (!media) throw fail(400, '批注素材不存在');
    if (media.duration != null && record.endSecond > media.duration) throw fail(400, '批注时间超出素材时长');
    if (record.status === '已审核' && !record.athleteIdentity) throw fail(400, '请先确认运动员与泳道');
  }
  if (record.recordId && ![...data.swim, ...data.trainings].some(r => r.id === record.recordId)) throw fail(400, '关联成绩/训练不存在');
  if (collection === 'weakpoints') {
    const ids = new Set(COLLECTIONS.flatMap(key => data[key].map(r => r.id)));
    const refs = String(record.sourceRef || '').split(/[,，、\s]+/).filter(Boolean);
    if (refs.some(id => !ids.has(id))) throw fail(400, '薄弱点引用的来源记录不存在');
    if (record.sourceType === '技能评估' && (!refs.length || refs.some(id => !data.skillAssessments.some(row => row.id === id && row.status === '已确认')))) throw fail(400, '技能来源须关联已确认评估');
  }
  if (collection === 'checkins' && !data.weakpoints.some(point => point.id === record.weakPointId)) throw fail(400, '打卡关联的薄弱点不存在');
  trainingRelations(collection, record, data, previous);
}

// Repository contains code only. The adapter holds privileged keys on the server.
export function createCloudHandler({ backend, origins, now = Date.now, sessionMs = 60 * 60 * 1000 }) {
  async function sessionFor(request) {
    const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('authorization') || '')?.[1];
    if (!token) return null;
    const session = await backend.session(await digestHex(token));
    if (!session || Date.parse(session.expires_at) <= now()) return null;
    const account = await backend.account(session.username);
    return account ? { ...session, mustChangePassword: account.must_change_password, role: 'owner', account } : null;
  }
  const viewSession = session => ({ authenticated: !!session, username: session?.username || '', role: session ? 'owner' : 'viewer', expiresAt: session ? Date.parse(session.expires_at) : null, mustChangePassword: !!session?.mustChangePassword, setupRequired: false });
  async function issue(username) {
    const token = randomHex(), expiresAt = now() + sessionMs;
    await backend.createSession({ token_hash: await digestHex(token), username, expires_at: new Date(expiresAt).toISOString() });
    return { accessToken: token, expiresAt };
  }
  return async request => {
    const origin = request.headers.get('origin');
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Access-Control-Expose-Headers': 'X-Nico-Revision, Content-Range', Vary: 'Origin' };
    const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
    try {
      if (origin && !origins.includes(origin)) throw fail(403, '此页面来源未获授权');
      if (origin) headers['Access-Control-Allow-Origin'] = origin;
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-Match, X-CSRF-Token', 'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE, OPTIONS' } });
      const url = new URL(request.url), endpoint = url.pathname.replace(/^.*\/nico-api(?=\/|$)/, '').replace(/\/$/, '');
      const parts = endpoint.split('/').filter(Boolean).map(decodeURIComponent);
      const method = request.method;
      const body = async () => {
        if (!request.headers.get('content-type')?.startsWith('application/json')) throw fail(415, '请求内容格式无效');
        const text = await request.text(); if (text.length > 5 * 1024 * 1024) throw fail(413, '请求内容过大');
        try { const value = JSON.parse(text); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; } catch { throw fail(400, '请求JSON无效'); }
      };
      const stream = async filename => {
        const response = await backend.download(filename, request.headers.get('range'), method);
        if (!response.ok && response.status !== 206) throw fail(404, '素材尚未上传或暂不可用');
        const mediaHeaders = { ...headers }; delete mediaHeaders['Content-Type'];
        for (const key of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) { const value = response.headers.get(key); if (value) mediaHeaders[key] = value; }
        return new Response(method === 'HEAD' ? null : response.body, { status: response.status, headers: mediaHeaders });
      };
      if (['GET', 'HEAD'].includes(method) && endpoint === '/api/public-summary') {
        const result = publicSnapshot((await backend.read()).data);
        return method === 'HEAD' ? new Response(null, { headers }) : json(result);
      }
      if (['GET', 'HEAD'].includes(method) && parts[0] === 'api' && parts[1] === 'public-media' && parts.length === 3) {
        if (!safeFile(parts[2]) || !publicFiles((await backend.read()).data).includes(parts[2])) throw fail(404, '此素材未对外开放');
        return await stream(parts[2]);
      }
      if (endpoint === '/api/auth/login' && method === 'POST') {
        const input = await body();
        const address = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        const ipAttempts = await backend.loginAttempt(await digestHex(`ip:${address}`));
        const accountAttempts = await backend.loginAttempt(await digestHex('nico-admin-login'));
        if (ipAttempts > 5 || accountAttempts > 20) throw fail(429, '登录尝试过多，请15分钟后再试');
        const current = await backend.account(typeof input.username === 'string' ? input.username.slice(0, 32) : '');
        const value = typeof input.password === 'string' && input.password.length <= 128 ? input.password : '';
        const derived = await passwordHash(value, current?.salt || '00000000000000000000000000000000');
        if (!current || !constantEqual(derived, current.password_hash)) throw fail(401, '账号或密码不正确');
        return json({ authenticated: true, username: current.username, role: 'owner', mustChangePassword: current.must_change_password, ...await issue(current.username) });
      }
      const session = await sessionFor(request);
      if (endpoint === '/api/auth/session' && method === 'GET') return json(viewSession(session));
      // Only the explicit public routes above may bypass authentication.
      if (!session) throw fail(401, '完整档案需要登录后查看');
      if (session && endpoint === '/api/auth/logout' && method === 'POST') { await backend.deleteSession(session.token_hash); return json({ success: true }); }
      if (session && endpoint === '/api/auth/password' && method === 'POST') {
        const input = await body();
        if (await backend.loginAttempt(await digestHex(`password:${session.username}`)) > 5) throw fail(429, '密码验证次数过多，请稍后再试');
        if (typeof input.currentPassword !== 'string' || input.currentPassword.length > 128 || !constantEqual(await passwordHash(input.currentPassword, session.account.salt), session.account.password_hash)) throw fail(401, '当前密码不正确');
        if (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 128 || !input.password.trim() || input.password === input.currentPassword) throw fail(400, '新密码需12–128位，且不能与当前密码相同');
        const salt = randomHex(16), changed = await backend.changePassword(session.username, session.account.password_hash, salt, await passwordHash(input.password, salt));
        if (!changed) throw fail(409, '账号状态已改变，请重新登录');
        return json({ success: true, ...await issue(session.username) });
      }
      if (session?.mustChangePassword) throw fail(403, '请先替换临时密码，再录入信息');
      if (endpoint === '/api/storage-setup' && method === 'POST') { await backend.ensureBucket(); return json({ success: true }); }
      const current = await backend.read(), data = normalizeState(structuredClone(current.data));
      if (method === 'GET' && endpoint === '/api/skills-overview') return json(skillTimeline(data, url.searchParams.get('skillId') ? growthId(url.searchParams.get('skillId')) : ''));
      if (method === 'GET' && parts[1] === 'goals' && parts[3] === 'candidates' && parts.length === 4) { const goal = data.goals.find(row => row.id === parts[2]); if (!goal) throw fail(404, '目标不存在'); return json(goalCandidates(data, goal)); }
      headers['X-Nico-Revision'] = String(current.revision);
      if (endpoint === '/api/snapshot' && method === 'GET') return json({ ...current, data, role: session ? 'owner' : 'viewer', athleteId: 'nico' });
      if (endpoint === '/api/backup' && method === 'GET') { if (!session) throw fail(401, '请先登录管理员账号'); return json({ format: 'nico-backup-v1', ...current }); }
      if (endpoint === '/api/public-preview' && method === 'GET') return json(publicSnapshot(data));
      if (method === 'GET' && parts[0] === 'api' && COLLECTIONS.includes(parts[1]) && parts.length === 2) return json(parts[1] === 'skillAssessments' && url.searchParams.get('skillId') ? data.skillAssessments.filter(row => row.skillId === growthId(url.searchParams.get('skillId'))) : data[parts[1]]);
      if (['GET', 'HEAD'].includes(method) && parts[1] === 'media' && parts[3] === 'content' && parts.length === 5) {
        const item = data.media.find(m => m.id === parts[2]);
        if (!item || !['original', 'playback', 'poster'].includes(parts[4])) throw fail(404, '素材不存在');
        const filename = fileFor(parts[4] === 'original' ? item.url : parts[4] === 'poster' ? item.posterUrl : item.playbackUrl || item.url);
        if (!filename) throw fail(404, '素材尚未生成');
        return await stream(filename);
      }
      if (method === 'PUT' && parts[1] === 'storage-import' && parts.length === 3) {
        if (!safeFile(parts[2]) || !privateFiles(data).includes(parts[2])) throw fail(400, '此文件不属于已录入素材');
        const buffer = await request.arrayBuffer(); if (buffer.byteLength > 50 * 1024 * 1024) throw fail(413, '素材超过50MB');
        await backend.upload(parts[2], buffer, request.headers.get('content-type') || 'application/octet-stream');
        return json({ success: true });
      }
      if (!['POST', 'PUT', 'DELETE'].includes(method)) throw fail(404, '接口不存在');
      const expected = request.headers.get('if-match');
      if (!/^\d+$/.test(expected || '')) throw fail(428, '请先加载最新记录，再提交修改');
      let trainingInput, receipt, mediaInput;
      if (method === 'POST' && parts.length === 2 && parts[0] === 'api' && (trainingCollection(parts[1]) || growthCollection(parts[1]) || parts[1] === 'swim')) {
        trainingInput = await body(); receipt = await creationRequest(trainingInput, session.username);
        const replay = creationReplay(data, parts[1], receipt);
        if (replay) return json(replay);
      }
      if (method === 'POST' && endpoint === '/api/media') {
        const form = await request.formData(), file = form.get('file');
        if (!(file instanceof Blob) || !file.size || file.size > 50 * 1024 * 1024) throw fail(400, '请选择50MB以内的素材');
        const input = Object.fromEntries([...form.entries()].filter(([key]) => key !== 'file'));
        validate('media', input);
        const source = await file.arrayBuffer(), sourceSha256 = await digestBytes(source);
        receipt = await creationRequest({ ...input, sourceSha256, sourceType: file.type }, session.username);
        const replay = creationReplay(data, 'media', receipt); if (replay) return json(replay);
        mediaInput = { input, file, source, sourceSha256 };
      }
      if (Number(expected) !== current.revision) throw fail(409, '记录已被更新，请刷新后核对并重试；当前输入已保留');
      let result, uploadedFile;
      const uploadedVariants = [];
      let planSync = true;
      try {
        if (parts[1] === 'media' && parts.length === 2 && method === 'POST') {
          const { input, file, source, sourceSha256 } = mediaInput;
          if (!(file instanceof Blob) || !file.size || file.size > 50 * 1024 * 1024) throw fail(400, '请选择50MB以内的素材');
          const types = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };
          if (!types[file.type]) throw fail(400, '不支持此素材类型');
          const record = validate('media', input);
          stampTraining(record, null, session.username, new Date(now()).toISOString(), receipt);
          uploadedFile = `file-${randomHex(16)}.${types[file.type]}`;
          Object.assign(record, { id: `media-${randomHex(16)}`, type: file.type.startsWith('video/') ? 'video' : 'photo', url: `/uploads/${uploadedFile}`, processingStatus: file.type.startsWith('video/') ? '已保存原片，兼容副本待处理' : '原图已保存' });
          record.sourceSha256 = sourceSha256;
          relations('media', record, data); await backend.upload(uploadedFile, source, file.type); data.media.push(record); result = record;
        } else if (parts[1] === 'media' && parts.length === 4 && method === 'POST' && ['variants', 'processing-failure'].includes(parts[3])) {
          const item = data.media.find(m => m.id === parts[2]);
          if (!item || item.type !== 'video') throw fail(404, '视频原片记录不存在');
          if (parts[3] === 'processing-failure') {
            const input = await body();
            if (input.sourceUrl !== item.url || typeof input.message !== 'string' || !input.message.trim() || input.message.length > 300) throw fail(400, '处理状态信息无效');
            // A failed new attempt must not destroy an existing usable variant.
            if (item.playbackUrl && item.posterUrl) return json(item);
            Object.assign(item, { processingStatus: '处理未完成，原片保留', processingError: input.message }); result = item;
          } else {
            const form = await request.formData(), playback = form.get('playback'), poster = form.get('poster');
            if ([...form.keys()].length !== 4 || [...form.keys()].some(k => !['sourceUrl', 'playback', 'poster', 'metadata'].includes(k)) || form.get('sourceUrl') !== item.url || !(playback instanceof Blob) || !playback.size || playback.size > MEDIA_MAX_BYTES || playback.type !== 'video/mp4' || !(poster instanceof Blob) || !poster.size || poster.size > POSTER_MAX_BYTES || poster.type !== 'image/jpeg') throw fail(400, '请选择属于此原片的播放副本及JPEG封面');
            const playbackBytes = new Uint8Array(await playback.arrayBuffer()), posterBytes = new Uint8Array(await poster.arrayBuffer());
            let info;
            const metadata = form.get('metadata');
            if (typeof metadata !== 'string' || metadata.length > 2000) throw fail(400, '处理信息格式无效');
            try { const container = inspectPlayback(playbackBytes); inspectPoster(posterBytes); info = validateVariantMetadata(JSON.parse(metadata), container); } catch (error) { throw fail(400, error.message); }
            let originalHash = item.sourceSha256;
            if (!originalHash) {
              const source = await backend.download(fileFor(item.url), null, 'GET');
              if (!source.ok) throw fail(404, '原片暂不可读取，请保留处理结果后重试');
              const sourceBytes = await source.arrayBuffer();
              if (sourceBytes.byteLength > MEDIA_MAX_BYTES) throw fail(400, '原片超过处理范围');
              originalHash = await digestBytes(sourceBytes);
            }
            if (originalHash !== info.sourceSha256) throw fail(400, '处理文件与已保存原片不一致，禁止替换关联');
            if (data.annotations.some(a => a.mediaId === item.id && a.endSecond > info.duration)) throw fail(400, '原片时长与现有批注矛盾，请先核对');
            const prefix = `derived-${randomHex(16)}`, playbackName = `${prefix}.mp4`, posterName = `${prefix}.jpg`;
            await backend.upload(playbackName, playbackBytes.buffer, 'video/mp4'); uploadedVariants.push(playbackName);
            await backend.upload(posterName, posterBytes.buffer, 'image/jpeg'); uploadedVariants.push(posterName);
            Object.assign(item, info, { playbackUrl: `/uploads/${playbackName}`, posterUrl: `/uploads/${posterName}` }); result = item;
          }
        } else if (growthCollection(parts[1]) && parts[0] === 'api' && parts.length === 4 && method === 'POST') {
          result = actGrowth(data, parts[1], parts[2], parts[3], await body(), { actor: session.username, now: new Date(now()).toISOString() });
        } else if (COLLECTIONS.includes(parts[1]) && parts[0] === 'api') {
          const key = parts[1];
          if (method === 'POST' && parts.length === 2 && key !== 'media') {
            const input = trainingInput ?? await body();
            if (growthCollection(key)) { result = saveGrowth(data, key, input, { id: `${key}-${randomHex(16)}`, actor: session.username, now: new Date(now()).toISOString(), request: receipt }); } else {
            const record = { ...validate(key, input), id: `${key}-${randomHex(16)}` };
            if (trainingCollection(key) || key === 'swim') stampTraining(record, null, session.username, new Date(now()).toISOString(), receipt);
            relations(key, record, data); data[key].push(record); result = record; }
          }
          else if (['PUT', 'DELETE'].includes(method) && parts.length === 3) {
            const index = data[key].findIndex(record => record.id === parts[2]); if (index < 0) throw fail(404, '记录不存在');
            if (method === 'PUT') {
              const previous = data[key][index], input = await body();
              if (growthCollection(key, previous) || key === 'goals' && input.modelVersion === 1) { result = saveGrowth(data, key, input, { id: previous.id, actor: session.username, now: new Date(now()).toISOString() }); } else {
              const record = validate(key, input, previous); relations(key, record, data, previous);
              if (trainingCollection(key) || key === 'swim') stampTraining(record, previous, session.username, new Date(now()).toISOString());
              if (key === 'plans') { const outcome = commitPlanUpdate(data, parts[2], data[key][index], record); if (outcome.error) throw fail(400, outcome.error); }
              data[key][index] = record; result = record; }
            }
            else { if (key === 'weakpoints' && data.checkins.some(c => c.weakPointId === parts[2])) throw fail(409, '该薄弱点已有打卡记录；请先处理打卡记录，或把状态改为“暂停 / 已改善”'); let record = data[key][index]; if (growthCollection(key, record)) record = deleteGrowth(data, key, record, { actor: session.username, now: new Date(now()).toISOString() }); data[key].splice(index, 1); data.trash.push({ id: `trash-${randomHex(16)}`, collection: key, record, deletedAt: new Date(now()).toISOString(), deletedBy: session.username }); result = { success: true, message: '已移至回收站，原素材保留' }; }
          } else throw fail(404, '接口不存在');
        } else if (parts[1] === 'trash' && parts[3] === 'restore' && method === 'POST') {
          const index = data.trash.findIndex(item => item.id === parts[2]); if (index < 0) throw fail(404, '回收记录不存在');
          const [item] = data.trash.splice(index, 1); if (data[item.collection].some(record => record.id === item.record.id)) throw fail(409, '相同ID已存在'); const record = growthCollection(item.collection, item.record) ? restoreGrowth(data, item.collection, item.record, { actor: session.username, now: new Date(now()).toISOString() }) : item.record; data[item.collection].push(record); result = record;
        } else if (endpoint === '/api/profile' && method === 'PUT') {
          const { name, sex, birthDate } = await body();
          if (typeof name !== 'string' || !name.trim() || name.length > 100 || !['', '女', '男', '其他'].includes(sex) || birthDate && !validDate(birthDate)) throw fail(400, '档案字段无效');
          result = data.profile = { name: name.trim(), sex, birthDate: birthDate || '' };
        } else if (endpoint === '/api/publishing' && method === 'PUT') {
          const { swimIds, mediaIds, story, confirmedBy, confirmedAt } = await body();
          if (!Array.isArray(swimIds) || !Array.isArray(mediaIds) || typeof story !== 'string' || story.length > 4000 || typeof confirmedBy !== 'string' || !confirmedBy.trim() || !validDate(confirmedAt) || swimIds.some(id => !data.swim.some(r => r.id === id)) || mediaIds.some(id => !data.media.some(r => r.id === id))) throw fail(400, '发布白名单或确认信息无效');
          result = data.publishing = { swimIds, mediaIds, story, confirmedBy: confirmedBy.slice(0, 100), confirmedAt };
        } else if (endpoint === '/api/restore' && method === 'POST') {
          planSync = false; // A restore must reproduce the backup exactly, not append a fresh draft.
          const input = await body(); if (input.format !== 'nico-backup-v1') throw fail(400, '请选择平台导出的完整备份');
          let restored; try { restored = normalizeState(input.data); } catch (error) { throw fail(400, error.message); }
          for (const key of LEGACY_COLLECTIONS) if (!Object.hasOwn(input.data, key) || new Set(restored[key].map(r => r.id)).size !== restored[key].length || restored[key].some(r => !r.id)) throw fail(400, '备份集合或记录ID缺失、重复');
          const dataVersion = data.schemaVersion, performanceVersion = data.performanceSchemaVersion;
          const retained = retainGrowthHistory(data, retainPlanHistory(data, restored), { actor: session.username, now: new Date(now()).toISOString() });
          let compatible = dataVersion === 2 ? upgradePrdState(retained).data : retained;
          if (performanceVersion === 1) compatible = upgradePerformanceState(compatible).data;
          for (const key of Object.keys(data)) delete data[key]; Object.assign(data, compatible); result = { success: true };
        } else if (endpoint === '/api/public-export' && method === 'POST') return json({ success: true, message: '云端公开白名单已生效，访客只读取这些内容；未提交私有数据到GitHub。' });
        else throw fail(404, '接口不存在');
        if (planSync) syncPlanDraft(current.data, data, { now: new Date(now()).toISOString(), triggeredByRecordId: result?.id ?? (typeof parts[2] === 'string' ? parts[2] : null) });
        preserveDeletedRecords(current.data, data, session.username, new Date(now()).toISOString());
        derivePrdState(data);
        normalizeState(data);
        const revision = await backend.save(current.revision, data, session.username);
        headers['X-Nico-Revision'] = String(revision);
        return json(result, method === 'POST' && COLLECTIONS.includes(parts[1]) && parts.length === 2 ? 201 : 200);
      } catch (error) {
        for (const name of [...uploadedVariants, ...(uploadedFile ? [uploadedFile] : [])]) { try { await backend.removeFile(name); } catch { /* Never remove an older linked file; unlinked cleanup can be retried. */ } }
        throw error;
      }
    } catch (error) { return json({ error: error.status ? error.message : '后台读取或保存失败，请保留输入并稍后重试' }, error.status || 500); }
  };
}
