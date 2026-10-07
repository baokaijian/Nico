import fs from 'node:fs';
import path from 'node:path';
import { validatePublicSummary } from '../shared/publication.mjs';
const root = path.resolve(import.meta.dirname, '..');
const release = path.join(root, 'release');
const snapshot = validatePublicSummary(JSON.parse(fs.readFileSync(path.join(release, 'public-summary.json'), 'utf8')));
const out = path.join(root, '.generated-public');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(root, 'public/favicon.svg'), path.join(out, 'favicon.svg'));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(path.join(out, 'public-summary.json'), JSON.stringify(snapshot, null, 2) + '\n');
for (const item of snapshot.media) for (const url of [item.url, item.posterUrl].filter(Boolean)) {
  if (!url.startsWith('/uploads/') || path.basename(url) !== url.slice(9)) throw new Error('公开素材路径无效');
  fs.mkdirSync(path.join(out, 'uploads'), { recursive: true });
  fs.copyFileSync(path.join(release, 'uploads', path.basename(url)), path.join(out, 'uploads', path.basename(url)));
}
console.log(`公开摘要：${snapshot.swim.length}条已选择成绩、${snapshot.media.length}项已选择素材；只读取release发布包，不读取私有事实库。`);
