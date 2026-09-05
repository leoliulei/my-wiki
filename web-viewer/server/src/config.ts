import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(here, '../..');
export const WIKI_ROOT = path.resolve(APP_ROOT, '..');
export const CLIENT_DIST = path.resolve(APP_ROOT, 'dist/client');
export const HOST = '127.0.0.1';
export const PORT = Number(process.env.PORT || 4317);
export const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE || 50 * 1024 * 1024);
export const WRITE_TOKEN = process.env.WIKI_WRITE_TOKEN || crypto.randomUUID();
export const ALLOWED_ZONES = new Set(['inbox', 'raw', 'wiki']);
export const ALLOWED_EXTENSIONS = new Set(['.md', '.txt', '.html', '.htm', '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp']);
