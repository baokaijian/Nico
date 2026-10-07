import path from 'node:path';
import { openStore } from '../server/store.mjs';
import { processMedia } from '../server/media.mjs';
const root = path.resolve(import.meta.dirname, '..');
const store = openStore({ filename: process.env.NICO_DB_PATH || path.join(root, 'data/nico.sqlite'), seedPath: process.env.NICO_SEED_PATH || path.join(root, 'data/original-input.json'), backupDir: process.env.NICO_BACKUP_DIR || path.join(root, 'data/backups') });
try {
  for (const item of store.read().data.media) {
    if (item.processingStatus === '已处理' && (item.type !== 'video' || item.processingVersion === 'h264-720p30-v2')) continue;
    console.log(`正在处理：${item.date} ${item.title}（保留原片）`);
    const info = await processMedia(item, process.env.NICO_UPLOADS_DIR || path.join(root, 'data/uploads'));
    const current = store.read();
    store.change(current.revision, data => Object.assign(data.media.find(m => m.id === item.id), info));
    console.log(`${info.processingStatus}：${item.id}`);
    if (info.processingStatus !== '已处理') process.exitCode = 1;
  }
} finally { store.close(); }
