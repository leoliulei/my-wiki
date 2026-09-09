import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outdir = path.join(root, 'dist/extension');
await fs.rm(outdir, { recursive: true, force: true });
await fs.mkdir(outdir, { recursive: true });
await fs.cp(path.join(root, 'extension/static'), outdir, { recursive: true });
await build({
  entryPoints: {
    background: path.join(root, 'extension/src/background.ts'),
    content: path.join(root, 'extension/src/content.ts'),
    popup: path.join(root, 'extension/src/popup.ts'),
  },
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  outdir,
  sourcemap: false,
  minify: false,
});
console.log(`浏览器扩展已构建：${outdir}`);
