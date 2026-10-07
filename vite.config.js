import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const appMode = process.env.VITE_APP_MODE || 'public';
if (!['public', 'private'].includes(appMode)) throw new Error('VITE_APP_MODE须为public或private');
const basePath = process.env.VITE_BASE_PATH || '/Nico/';
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(basePath)) throw new Error('VITE_BASE_PATH须为以/开头和结束的本机路径');
export default defineConfig({
  plugins: [react(), { name: 'nico-build-mode', generateBundle() { this.emitFile({ type: 'asset', fileName: 'nico-build.json', source: JSON.stringify({ schema: 1, mode: appMode, readOnly: appMode === 'public', basePath }) + '\n' }); } }],
  base: basePath,
  define: { 'import.meta.env.VITE_APP_MODE': JSON.stringify(appMode) },
  publicDir: '.generated-public',
  server: { host: '127.0.0.1', port: 5173, strictPort: true, fs: { deny: ['**/.env', '**/.env.*', '**/*.pem', '**/*.crt', '**/.git/**', '**/data/**', '**/review/**', '**/legacy-archive/**'] }, proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true } } },
  build: { outDir: appMode === 'private' ? 'dist-private' : 'dist', rollupOptions: { output: { entryFileNames: 'assets/[name]-[hash].js', chunkFileNames: 'assets/[name]-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' } } },
});
