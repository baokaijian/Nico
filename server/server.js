import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash, timingSafeEqual } from 'node:crypto';
import { COLLECTIONS, normalizeState, validateRecord, validDate, publicSnapshot, analysis } from '../shared/domain.mjs';
import { openStore } from './store.mjs';
import { processMedia, inspectMedia } from './media.mjs';
import { exportPublic } from './public-export.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let sequence = 0;
const makeId = key => `${key}-${Date.now()}-${++sequence}`;
const httpError = (status, message) => Object.assign(new Error(message), { status });
const digest = value => createHash('sha256').update(value).digest();
export function maintenanceMode(host, env = process.env) {
  const remote = !['127.0.0.1', 'localhost', '::1'].includes(host);
  return { authRequired: remote || env.NICO_AUTH_REQUIRED === 'true', readOnly: remote || env.NICO_READ_ONLY === 'true' };
}
export function createApp({ store, uploadsDir, authRequired = false, tokens = {}, allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'], processUploads = true, webDir, readOnly = false, releaseDir = path.join(project, 'release') } = {}) {
  if (authRequired && !tokens.owner) throw new Error('远程服务必须配置NICO_OWNER_TOKEN，不允许匿名启动');
  for (const token of Object.values(tokens)) if (token && token.length < 32) throw new Error('访问密钥至少需要32个字符');
  fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o700 });
  const app = express();
  app.disable('x-powered-by');
  if (readOnly) app.use((req, res, next) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : res.set('Allow', 'GET, HEAD, OPTIONS').status(405).json({ error: '此服务只读，公网不接受新增、修改、删除或上传' }));
  // The web shell contains no private records. Only API/media requests require credentials.
  if (webDir) app.use('/Nico', express.static(webDir, { dotfiles: 'deny' }));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff');
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) return next(httpError(403, '此页面来源未获授权'));
    if (!authRequired && !['127.0.0.1', 'localhost', '[::1]'].includes((req.headers.host || '').replace(/:\d+$/, ''))) return next(httpError(403, '本机服务只接受本机地址'));
    if (origin) { res.set('Access-Control-Allow-Origin', origin); res.set('Vary', 'Origin'); }
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, If-Match');
    res.set('Access-Control-Expose-Headers', 'X-Nico-Revision');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    const credential = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
    let role = !authRequired ? 'owner' : '';
    if (credential) role = Object.entries(tokens).find(([, token]) => token && timingSafeEqual(digest(token), digest(credential)))?.[0] || '';
    if (!role) return next(httpError(401, '请输入有效访问密钥'));
    req.role = role; next();
  });
  app.use(express.json({ limit: '5mb' }));
  const requireOwner = req => { if (req.role !== 'owner') throw httpError(403, '此操作仅限家长管理者'); };
  const canWrite = (req, collection) => {
    if (req.role === 'owner' || req.role === 'coach' && ['plans', 'annotations', 'trainings', 'swim'].includes(collection)) return;
    throw httpError(403, '没有此记录的修改权限');
  };
  const revision = req => {
    const header = req.headers['if-match'];
    if (!header || !/^\d+$/.test(header)) throw httpError(428, '请先加载最新记录，再提交修改');
    return Number(header);
  };
  const reply = (res, saved, status = 200) => res.set('X-Nico-Revision', String(saved.revision)).status(status).json(saved.result);
  const validate = (...args) => { try { return validateRecord(...args); } catch (error) { throw httpError(400, error.message); } };
  function relations(collection, record, data) {
    if (collection === 'plans') {
      const existingIds = new Set(COLLECTIONS.flatMap(key => data[key].map(r => r.id)));
      if ((record.sourceIds || []).some(id => !existingIds.has(id))) throw httpError(400, '计划引用的来源记录不存在');
      if (record.sourceVersion && record.sourceVersion !== analysis(data).version) throw httpError(409, '计划依据已经改变，请重新读取当前分析并核对');
    }
    if (collection === 'annotations') {
      const media = data.media.find(m => m.id === record.mediaId);
      if (!media) throw httpError(400, '批注素材不存在');
      if (media.duration != null && record.endSecond > media.duration) throw httpError(400, '批注时间超出素材时长');
      if (record.status === '已审核' && !record.athleteIdentity) throw httpError(400, '请先确认运动员与泳道');
    }
    if (record.recordId && ![...data.swim, ...data.trainings].some(r => r.id === record.recordId)) throw httpError(400, '关联成绩/训练不存在');
    if (collection === 'trainings' && record.plannedSessionId && !data.plans.some(p => p.sessions?.some(s => `${p.id}/${s.id}` === record.plannedSessionId))) throw httpError(400, '关联计划课次不存在');
  }
  app.get('/api/snapshot', (req, res) => {
    const current = store.read(); res.set('X-Nico-Revision', String(current.revision)).json({ ...current, role: req.role, athleteId: 'nico' });
  });
  for (const key of COLLECTIONS) {
    app.get(`/api/${key}`, (req, res) => { const current = store.read(); res.set('X-Nico-Revision', String(current.revision)).json(current.data[key]); });
    if (key !== 'media') app.post(`/api/${key}`, (req, res) => {
      canWrite(req, key); const record = { ...validate(key, req.body), id: makeId(key) };
      reply(res, store.change(revision(req), data => { relations(key, record, data); data[key].push(record); return record; }), 201);
    });
    app.put(`/api/${key}/:id`, (req, res) => {
      canWrite(req, key);
      reply(res, store.change(revision(req), data => {
        const index = data[key].findIndex(r => r.id === req.params.id);
        if (index < 0) throw httpError(404, '记录不存在');
        const record = validate(key, req.body, data[key][index]); relations(key, record, data);
        if (key === 'plans') { data.planHistory ||= []; data.planHistory.push(structuredClone(data[key][index])); }
        data[key][index] = record; return record;
      }));
    });
    app.delete(`/api/${key}/:id`, (req, res) => {
      canWrite(req, key);
      reply(res, store.change(revision(req), data => {
        const index = data[key].findIndex(r => r.id === req.params.id);
        if (index < 0) throw httpError(404, '记录不存在');
        const [record] = data[key].splice(index, 1); data.trash ||= [];
        data.trash.push({ id: makeId('trash'), collection: key, record, deletedAt: new Date().toISOString() });
        return { success: true, message: '已移至回收站，原素材保留，可恢复' };
      }));
    });
  }
  app.post('/api/trash/:id/restore', (req, res) => {
    requireOwner(req);
    reply(res, store.change(revision(req), data => {
      const index = data.trash.findIndex(t => t.id === req.params.id);
      if (index < 0) throw httpError(404, '回收记录不存在');
      const [item] = data.trash.splice(index, 1);
      if (data[item.collection].some(r => r.id === item.record.id)) throw httpError(409, '相同ID已存在');
      data[item.collection].push(item.record); return item.record;
    }));
  });
  app.put('/api/profile', (req, res) => {
    requireOwner(req); const { name, sex, birthDate } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || !['', '女', '男'].includes(sex) || birthDate && !validDate(birthDate)) throw httpError(400, '档案字段无效');
    reply(res, store.change(revision(req), data => (data.profile = { name: name.trim(), sex, birthDate: birthDate || '' })));
  });
  app.put('/api/publishing', (req, res) => {
    requireOwner(req); const { swimIds, mediaIds, story, confirmedBy, confirmedAt } = req.body;
    if (!Array.isArray(swimIds) || !Array.isArray(mediaIds) || typeof story !== 'string' || story.length > 4000 || !confirmedBy || !validDate(confirmedAt)) throw httpError(400, '请选择内容并填写发布范围确认人和日期');
    reply(res, store.change(revision(req), data => {
      if (swimIds.some(id => !data.swim.some(r => r.id === id)) || mediaIds.some(id => !data.media.some(r => r.id === id))) throw httpError(400, '选择的记录或素材不存在');
      data.publishing = { swimIds, mediaIds, story, confirmedBy: String(confirmedBy).slice(0, 100), confirmedAt }; return data.publishing;
    }));
  });
  app.get('/api/public-preview', (req, res) => { requireOwner(req); res.json(publicSnapshot(store.read().data)); });
  app.post('/api/public-export', (req, res) => {
    requireOwner(req);
    const current = store.read();
    if (revision(req) !== current.revision) throw httpError(409, '发布范围已更新，请刷新后重新核对');
    res.json(exportPublic(current.data, releaseDir, uploadsDir));
  });
  app.get('/api/backup', (req, res) => { requireOwner(req); res.json({ format: 'nico-backup-v1', ...store.read() }); });
  app.post('/api/restore', (req, res) => {
    requireOwner(req);
    if (req.body?.format !== 'nico-backup-v1') throw httpError(400, '请选择平台导出的完整备份');
    let restored; try { restored = normalizeState(req.body.data); } catch (error) { throw httpError(400, error.message); }
    for (const key of COLLECTIONS) if (!Object.hasOwn(req.body.data, key) || new Set(restored[key].map(r => r.id)).size !== restored[key].length || restored[key].some(r => !r.id)) throw httpError(400, '备份集合或记录ID缺失、重复');
    reply(res, store.change(revision(req), data => { for (const key of Object.keys(data)) delete data[key]; Object.assign(data, restored); return { success: true }; }));
  });
  const upload = multer({ storage: multer.diskStorage({ destination: uploadsDir, filename: (_req, file, cb) => cb(null, `${makeId('file')}${path.extname(file.originalname).toLowerCase()}`) }), limits: { fileSize: 100 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
    const formats = { '.png': ['image/png'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.webp': ['image/webp'], '.mp4': ['video/mp4'], '.mov': ['video/quicktime'], '.webm': ['video/webm'] };
    if (!formats[path.extname(file.originalname).toLowerCase()]?.includes(file.mimetype)) return cb(httpError(400, '支持PNG/JPEG/WebP或MP4/MOV/WebM；请勿修改扩展名伪装格式'));
    cb(null, true);
  } });
  app.post('/api/media', (req, _res, next) => { try { canWrite(req, 'media'); revision(req); next(); } catch (error) { next(error); } }, upload.single('file'), async (req, res) => {
    if (!req.file) throw httpError(400, '请选择文件');
    try {
      const record = { ...validate('media', req.body), id: makeId('media'), type: req.file.mimetype.startsWith('video/') ? 'video' : 'photo', url: `/uploads/${req.file.filename}`, processingStatus: '待处理' };
      if (processUploads) {
        let info;
        try { info = await inspectMedia(req.file.path, record.type); } catch { throw httpError(400, '无法识别真实素材格式，请检查文件或FFmpeg配置'); }
        record.duration = info.duration;
      }
      const saved = store.change(revision(req), data => { relations('media', record, data); data.media.push(record); return record; }); reply(res, saved, 201);
      if (processUploads) processMedia(record, uploadsDir).then(info => {
        const current = store.read(); store.change(current.revision, data => { const target = data.media.find(m => m.id === record.id); if (target) Object.assign(target, info); });
      }).catch(error => console.error('素材处理失败，原文件已保留：', error.message));
    } catch (error) { fs.unlinkSync(req.file.path); throw error; }
  });
  app.get('/api/media/:id/content/:variant', (req, res) => {
    if (!['poster', 'original', 'playback'].includes(req.params.variant)) throw httpError(404, '素材类型不存在');
    const item = store.read().data.media.find(m => m.id === req.params.id);
    if (!item) throw httpError(404, '素材不存在');
    const url = req.params.variant === 'poster' ? item.posterUrl : req.params.variant === 'original' ? item.url : item.playbackUrl || item.url;
    if (!url?.startsWith('/uploads/')) throw httpError(404, '素材尚未生成');
    res.sendFile(path.join(uploadsDir, path.basename(url)));
  });
  app.use((_req, _res, next) => next(httpError(404, '接口不存在')));
  app.use((error, _req, res, _next) => {
    const status = error.status || (error instanceof multer.MulterError || error instanceof SyntaxError ? 400 : 500);
    if (status === 500) console.error(error);
    res.status(status).json({ error: status === 500 ? '服务保存或读取失败，未确认成功；请保留输入并检查备份' : error.message });
  });
  return app;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.NICO_HOST || '127.0.0.1';
  const store = openStore({ filename: process.env.NICO_DB_PATH || path.join(project, 'data/nico.sqlite'), seedPath: process.env.NICO_SEED_PATH || path.join(project, 'data/original-input.json'), backupDir: process.env.NICO_BACKUP_DIR || path.join(project, 'data/backups') });
  const tokens = { owner: process.env.NICO_OWNER_TOKEN, coach: process.env.NICO_COACH_TOKEN, viewer: process.env.NICO_VIEWER_TOKEN };
  const app = createApp({ store, uploadsDir: process.env.NICO_UPLOADS_DIR || path.join(project, 'data/uploads'), ...maintenanceMode(host), tokens, allowedOrigins: process.env.NICO_ALLOWED_ORIGINS?.split(',').filter(Boolean) || undefined, webDir: process.env.NICO_WEB_DIR });
  const server = app.listen(Number(process.env.PORT || 3001), host, () => console.log(`Nico私有服务：http://${host}:${process.env.PORT || 3001}`));
  const stop = () => server.close(() => { store.close(); process.exit(0); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
