import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

export const MAX_INITIAL_JS_GZIP_BYTES = 180 * 1024;
const FORBIDDEN_INITIAL_CHUNKS = ['ffmpeg', 'pdf-document'];

function normalizeAssetPath(rawHref) {
  const clean = String(rawHref || '').split('?')[0].split('#')[0];
  const idx = clean.indexOf('assets/');
  return idx >= 0 ? clean.slice(idx) : clean.replace(/^\/+/, '');
}

export function checkBundleBudget({
  distDir = path.resolve(process.cwd(), 'dist'),
  maxGzipBytes = MAX_INITIAL_JS_GZIP_BYTES,
} = {}) {
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error(`未找到构建产物 ${indexHtmlPath}，请先运行 npm run build。`);
  }
  const html = fs.readFileSync(indexHtmlPath, 'utf8');

  const scriptMatches = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/gi)].map(m => normalizeAssetPath(m[1]));
  const preloadMatches = [...html.matchAll(/<link\b[^>]*\brel=["']modulepreload["'][^>]*\bhref=["']([^"']+\.js)["'][^>]*>/gi)].map(m => normalizeAssetPath(m[1]));
  const initialAssets = [...new Set([...scriptMatches, ...preloadMatches])];

  if (!scriptMatches.length) {
    throw new Error('dist/index.html 未包含入口 JS 脚本。');
  }

  for (const relPath of initialAssets) {
    const lower = relPath.toLowerCase();
    for (const forbidden of FORBIDDEN_INITIAL_CHUNKS) {
      if (lower.includes(forbidden)) {
        throw new Error(`首屏不得同步加载重模块 (${forbidden})：发现 ${relPath}`);
      }
    }
  }

  let entryGzipBytes = 0;
  let totalInitialGzipBytes = 0;
  const details = [];

  for (const relPath of initialAssets) {
    const fullPath = path.join(distDir, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`dist/index.html 引用的资源不存在：${relPath}`);
    }
    const raw = fs.readFileSync(fullPath);
    const gzipBytes = zlib.gzipSync(raw, { level: 9 }).length;
    if (scriptMatches.includes(relPath)) {
      entryGzipBytes += gzipBytes;
    }
    totalInitialGzipBytes += gzipBytes;
    details.push({ file: relPath, rawBytes: raw.length, gzipBytes });
  }

  if (entryGzipBytes > maxGzipBytes) {
    throw new Error(`首屏主包 gzip 体积超限：${entryGzipBytes} bytes > ${maxGzipBytes} bytes (180KB)`);
  }
  if (totalInitialGzipBytes > maxGzipBytes) {
    throw new Error(`首屏初始 JS 总 gzip 体积超限：${totalInitialGzipBytes} bytes > ${maxGzipBytes} bytes (180KB)`);
  }

  return {
    ok: true,
    maxGzipBytes,
    entryGzipBytes,
    totalInitialGzipBytes,
    initialAssets: details,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = checkBundleBudget();
  console.log(
    `Bundle budget OK: entry ${(result.entryGzipBytes / 1024).toFixed(1)} KB gzip, initial total ${(result.totalInitialGzipBytes / 1024).toFixed(1)} KB gzip <= ${(result.maxGzipBytes / 1024).toFixed(0)} KB.`
  );
}
