import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePublicDirectory } from '../shared/publication.mjs';

// A separate process with no database, upload handler, credentials or private API.
export function createPublicApp({ webDir } = {}) {
  const directory = path.resolve(webDir || path.join(import.meta.dirname, '../dist'));
  const { manifest } = validatePublicDirectory(directory);
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Frame-Options', 'DENY');
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) return res.set('Allow', 'GET, HEAD').status(405).json({ error: '公网展示只读，不接受新增、修改、删除或上传' });
    next();
  });
  if (manifest.basePath !== '/') app.get('/', (_req, res) => res.redirect(manifest.basePath));
  app.use(manifest.basePath, express.static(directory, { dotfiles: 'deny', fallthrough: true, redirect: true, index: 'index.html', setHeaders: res => res.set('Cache-Control', 'no-store') }));
  app.use((_req, res) => res.status(404).json({ error: '此地址不属于公开展示内容' }));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: '公开内容暂不可读取' }));
  return app;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.NICO_PUBLIC_HOST || '127.0.0.1';
  const port = Number(process.env.NICO_PUBLIC_PORT || 8080);
  const server = createPublicApp({ webDir: process.env.NICO_PUBLIC_WEB_DIR }).listen(port, host, () => console.log(`Nico公开只读展示：http://${host}:${port}`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
