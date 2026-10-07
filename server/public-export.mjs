import fs from 'node:fs';
import path from 'node:path';
import { publicSnapshot } from '../shared/domain.mjs';
import { atomicJSON } from './store.mjs';
export function exportPublic(state, destination, uploadsDir) {
  const snapshot = publicSnapshot(state);
  if (!snapshot.publishedAt) throw Object.assign(new Error('请先保存家长确认的发布白名单'), { status: 400 });
  // Build a fresh staged package so a failed copy never mixes old/new releases.
  const stage = `${destination}.stage`;
  fs.rmSync(stage, { recursive: true, force: true }); fs.mkdirSync(stage, { recursive: true });
  for (const item of snapshot.media) {
    const original = state.media.find(m => m.id === item.id);
    if (item.type === 'video' && original.playbackCodec !== 'h264') throw Object.assign(new Error('所选视频尚无兼容播放副本，请先完成素材处理'), { status: 400 });
    for (const url of [item.url, item.posterUrl].filter(Boolean)) {
      if (!url.startsWith('/uploads/') || path.basename(url) !== url.slice(9)) throw Object.assign(new Error('素材路径无效'), { status: 400 });
      fs.mkdirSync(path.join(stage, 'uploads'), { recursive: true });
      fs.copyFileSync(path.join(uploadsDir, path.basename(url)), path.join(stage, 'uploads', path.basename(url)));
    }
  }
  atomicJSON(path.join(stage, 'public-summary.json'), snapshot);
  fs.rmSync(`${destination}.previous`, { recursive: true, force: true });
  if (fs.existsSync(destination)) fs.renameSync(destination, `${destination}.previous`);
  fs.renameSync(stage, destination);
  return { success: true, swimCount: snapshot.swim.length, mediaCount: snapshot.media.length, message: '已生成release目录的公开发布包，未上传或发布网站' };
}
