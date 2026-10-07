import fs from 'node:fs';
import { validatePublicSummary } from '../shared/publication.mjs';
const snapshot = validatePublicSummary(JSON.parse(fs.readFileSync(new URL('../release/public-summary.json', import.meta.url), 'utf8')));
if (!snapshot.publishedAt || !snapshot.story && !snapshot.swim.length && !snapshot.media.length) throw new Error('发布包尚无已确认展示内容，已停止部署以保留现网展示。请先在本机确认发布范围并生成发布包。');
console.log('已确认非空展示包，可以继续公网只读部署。');
