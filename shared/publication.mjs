import fs from 'node:fs';
import path from 'node:path';
import { validDate, parseTime } from './domain.mjs';

const hasOnly = (value, fields) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => fields.includes(key));
const text = value => typeof value === 'string' && value.length > 0;
const mediaPath = value => typeof value === 'string' && /^\/uploads\/[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(value);
export function validatePublicSummary(summary) {
  if (!hasOnly(summary, ['publishedAt', 'story', 'swim', 'media']) || typeof summary.story !== 'string' || !Array.isArray(summary.swim) || !Array.isArray(summary.media)) throw new Error('公开摘要格式或字段无效');
  if (summary.publishedAt === null) {
    if (summary.story || summary.swim.length || summary.media.length) throw new Error('尚未确认发布范围，不能生成非空公开摘要');
  } else if (!validDate(summary.publishedAt)) throw new Error('公开摘要确认日期无效');
  for (const record of summary.swim) {
    if (!hasOnly(record, ['id', 'date', 'distance', 'stroke', 'poolLength', 'time', 'seconds']) || !text(record.id) || !validDate(record.date) || !/^\d{1,4}m$/.test(record.distance) || !['自由泳', '仰泳', '蛙泳', '蝶泳', '混合泳'].includes(record.stroke) || !['25m', '50m'].includes(record.poolLength) || parseTime(record.time) === null || typeof record.seconds !== 'number' || !Number.isFinite(record.seconds) || record.seconds !== parseTime(record.time)) throw new Error('公开成绩格式无效或包含私有字段');
  }
  for (const record of summary.media) {
    if (!hasOnly(record, ['id', 'date', 'title', 'type', 'url', 'posterUrl', 'duration']) || !text(record.id) || !validDate(record.date) || !text(record.title) || !['video', 'photo'].includes(record.type) || !mediaPath(record.url) || record.posterUrl && !mediaPath(record.posterUrl) || record.duration != null && (typeof record.duration !== 'number' || !Number.isFinite(record.duration) || record.duration <= 0)) throw new Error('公开素材格式或路径无效');
  }
  for (const records of [summary.swim, summary.media]) if (new Set(records.map(record => record.id)).size !== records.length) throw new Error('公开摘要记录ID重复');
  return summary;
}
export function validatePublicDirectory(directory, privateIds = []) {
  const root = path.resolve(directory);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'nico-build.json'), 'utf8'));
  if (manifest.mode !== 'public' || manifest.readOnly !== true || manifest.schema !== 1 || typeof manifest.basePath !== 'string' || !/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(manifest.basePath)) throw new Error('此目录不是经过标记的公网只读构建，禁止发布或启动');
  const summary = validatePublicSummary(JSON.parse(fs.readFileSync(path.join(root, 'public-summary.json'), 'utf8')));
  const mediaFiles = new Set(summary.media.flatMap(record => [record.url, record.posterUrl].filter(Boolean).map(url => url.slice(1))));
  const visited = new Set();
  function inspect(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const filename = path.join(current, entry.name), relative = path.relative(root, filename).split(path.sep).join('/');
      if (entry.isSymbolicLink()) throw new Error('公开产物不允许符号链接');
      if (entry.isDirectory()) { if (!['assets', 'uploads'].includes(relative)) throw new Error(`公开产物包含未知目录：${relative}`); inspect(filename); continue; }
      if (!entry.isFile()) throw new Error('公开产物只允许普通文件');
      if (!['index.html', 'public-summary.json', 'nico-build.json', 'favicon.svg', '.nojekyll'].includes(relative) && !/^assets\/[A-Za-z0-9_.-]+\.(?:js|css|svg|png|jpg|webp|woff2?|ttf)$/.test(relative) && !mediaFiles.has(relative)) throw new Error(`公开产物包含未允许文件：${relative}`);
      if (relative.startsWith('uploads/') && !mediaFiles.has(relative)) throw new Error('公开产物包含未选择素材');
      if (/\.(?:js|json|html)$/.test(filename) && privateIds.some(id => fs.readFileSync(filename, 'utf8').includes(id))) throw new Error(`公开产物包含私有记录：${relative}`);
      visited.add(relative);
    }
  }
  inspect(root);
  if (!visited.has('index.html') || [...mediaFiles].some(file => !visited.has(file))) throw new Error('公开页面或已选择素材文件缺失');
  return { manifest, summary, files: visited.size };
}
