import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const staticMode = process.env.VITE_STATIC_MODE === 'true';
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'my-wiki';

export default defineConfig({
  base: staticMode ? `/${repositoryName}/` : '/',
  plugins: [react()],
  root: '.',
  publicDir: staticMode ? '../static-generated' : 'public',
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          editor: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-link', '@tiptap/extension-image', '@tiptap/extension-placeholder'],
          markdown: ['marked', 'dompurify', 'turndown'],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:4317',
    },
  },
});
