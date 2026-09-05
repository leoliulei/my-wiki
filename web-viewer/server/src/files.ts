import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import YAML from 'yaml';
import { ALLOWED_EXTENSIONS, ALLOWED_ZONES, WIKI_ROOT } from './config.js';

export type Zone = 'inbox' | 'raw' | 'wiki';
export type FileKind = 'md' | 'txt' | 'html' | 'pdf' | 'image';
export type InboxStatus = 'inbox' | 'review' | 'archived';
export interface InboxRecord {
  path: string;
  sourceUrl?: string;
  finalUrl?: string;
  fetchedAt?: string;
  httpStatus?: number;
  contentType?: string;
  size?: number;
  sha256?: string;
  status: InboxStatus;
}
export interface FileEntry {
  path: string;
  name: string;
  title: string;
  kind: FileKind;
  zone: Zone;
  size: number;
  mtime: number;
  version: string;
  frontmatter: Record<string, unknown> | null;
  category: string;
  editable: boolean;
  status?: InboxStatus;
  sourceUrl?: string;
  finalUrl?: string;
  contentType?: string;
  sha256?: string;
  savedAt?: string;
}

const IGNORE_DIRS = new Set(['.git', '.obsidian', '.skills', '.agents', 'node_modules', 'web-viewer']);
const TYPE_DIR: Record<string, string> = {
  summary: 'summaries', entity: 'entities', concept: 'concepts', comparison: 'comparisons',
  overview: 'overviews', synthesis: 'synthesis',
};

export function normalizeRelative(input: string): string {
  const decoded = decodeURIComponent(String(input || '')).replaceAll('\\', '/').replace(/^\/+/, '');
  const normalized = path.posix.normalize(decoded);
  const zone = normalized.split('/')[0];
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../') || !ALLOWED_ZONES.has(zone)) {
    const error = new Error('路径越界或不属于知识库三区');
    Object.assign(error, { status: 403 });
    throw error;
  }
  return normalized;
}

export function absolutePath(relative: string): string {
  const safe = normalizeRelative(relative);
  const full = path.resolve(WIKI_ROOT, safe);
  const allowed = [...ALLOWED_ZONES].some((zone) => full === path.resolve(WIKI_ROOT, zone) || full.startsWith(path.resolve(WIKI_ROOT, zone) + path.sep));
  if (!allowed) {
    const error = new Error('路径越界'); Object.assign(error, { status: 403 }); throw error;
  }
  return full;
}

export function zoneOf(relative: string): Zone { return normalizeRelative(relative).split('/')[0] as Zone; }
export function kindOf(relative: string): FileKind {
  const ext = path.extname(relative).toLowerCase();
  if (ext === '.md') return 'md'; if (ext === '.txt') return 'txt';
  if (ext === '.html' || ext === '.htm') return 'html'; if (ext === '.pdf') return 'pdf';
  return 'image';
}
export function hash(content: Buffer | string): string { return crypto.createHash('sha256').update(content).digest('hex'); }
export function sanitizeName(input: string, fallback = '未命名'): string {
  const cleaned = input.normalize('NFKC').replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').replace(/^\.+|\.+$/g, '').trim();
  return (cleaned || fallback).slice(0, 120);
}
export function slugName(input: string, fallback = '未命名'): string {
  return sanitizeName(input, fallback).replace(/\s+/g, '-');
}
export async function uniquePath(directory: string, fileName: string): Promise<string> {
  const parsed = path.parse(fileName); let candidate = path.posix.join(directory, fileName); let n = 2;
  while (await exists(absolutePath(candidate))) candidate = path.posix.join(directory, `${parsed.name}-${n++}${parsed.ext}`);
  return candidate;
}
export async function exists(file: string): Promise<boolean> { try { await fs.access(file); return true; } catch { return false; } }

async function walk(directory: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.isFile() && ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(path.relative(WIKI_ROOT, full).split(path.sep).join('/'));
  }
  return out;
}

function safeMatter(content: string) {
  try { const parsed = matter(content); return { data: parsed.data as Record<string, unknown>, body: parsed.content }; }
  catch { return { data: {}, body: content }; }
}

function titleFor(relative: string, frontmatter: Record<string, unknown> | null): string {
  return typeof frontmatter?.title === 'string' && frontmatter.title.trim() ? frontmatter.title : path.basename(relative, path.extname(relative));
}
function categoryFor(relative: string, frontmatter: Record<string, unknown> | null): string {
  const type = typeof frontmatter?.type === 'string' ? frontmatter.type : '';
  if (type) return type;
  if (relative.startsWith('raw/')) return 'raw'; if (relative.startsWith('inbox/')) return 'inbox';
  const folder = relative.split('/')[1];
  return Object.entries(TYPE_DIR).find(([, dir]) => dir === folder)?.[0] || 'wiki';
}

export async function readInboxManifest(): Promise<InboxRecord[]> {
  const manifestPath = path.join(WIKI_ROOT, 'inbox', '_inbox.md');
  if (!(await exists(manifestPath))) return [];
  const raw = await fs.readFile(manifestPath, 'utf8');
  const match = raw.match(/<!-- WEB_VIEWER_DATA\n([\s\S]*?)\nWEB_VIEWER_DATA -->/);
  if (!match) return [];
  try { const parsed = JSON.parse(match[1]); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

export async function writeInboxManifest(records: InboxRecord[]): Promise<void> {
  const manifestPath = path.join(WIKI_ROOT, 'inbox', '_inbox.md');
  let raw = await fs.readFile(manifestPath, 'utf8').catch(() => '---\ntype: inbox-manifest\ntitle: 暂存区清单\n---\n\n# 暂存区清单\n');
  const block = `<!-- WEB_VIEWER_DATA\n${JSON.stringify(records, null, 2)}\nWEB_VIEWER_DATA -->`;
  if (/<!-- WEB_VIEWER_DATA[\s\S]*?WEB_VIEWER_DATA -->/.test(raw)) raw = raw.replace(/<!-- WEB_VIEWER_DATA[\s\S]*?WEB_VIEWER_DATA -->/, block);
  else raw = `${raw.trim()}\n\n${block}\n`;
  raw = raw.replace(/^updated: .*$/m, `updated: ${new Date().toISOString().slice(0, 10)}`);
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await atomicWrite(manifestPath, raw);
}

export async function readEntry(relative: string, records?: InboxRecord[]): Promise<FileEntry> {
  const safe = normalizeRelative(relative); const full = absolutePath(safe); const stat = await fs.stat(full);
  const kind = kindOf(safe); let frontmatter: Record<string, unknown> | null = null; let contentHash: string;
  if (kind === 'md') { const content = await fs.readFile(full, 'utf8'); frontmatter = safeMatter(content).data; contentHash = hash(content); }
  else { const content = await fs.readFile(full); contentHash = hash(content); }
  const record = (records || await readInboxManifest()).find((item) => item.path === safe);
  const status = ((frontmatter?.status as InboxStatus | undefined) || record?.status || (safe.startsWith('inbox/') && safe !== 'inbox/_inbox.md' ? 'inbox' : undefined));
  return {
    path: safe, name: path.basename(safe), title: titleFor(safe, frontmatter), kind, zone: zoneOf(safe), size: stat.size,
    mtime: stat.mtimeMs, version: `${stat.mtimeMs}:${contentHash}`, frontmatter, category: categoryFor(safe, frontmatter),
    editable: !safe.startsWith('raw/') && kind === 'md' && safe !== 'inbox/_inbox.md', status,
    sourceUrl: record?.sourceUrl || (typeof frontmatter?.source === 'string' && /^https?:/.test(frontmatter.source) ? frontmatter.source : undefined),
    finalUrl: record?.finalUrl, contentType: record?.contentType, sha256: record?.sha256,
    savedAt: record?.fetchedAt || (typeof frontmatter?.saved === 'string' ? frontmatter.saved : undefined),
  };
}

export async function listEntries(): Promise<FileEntry[]> {
  const records = await readInboxManifest(); const paths: string[] = [];
  for (const zone of ALLOWED_ZONES) {
    const dir = path.join(WIKI_ROOT, zone); if (await exists(dir)) paths.push(...await walk(dir));
  }
  const results: FileEntry[] = [];
  for (const relative of paths) results.push(await readEntry(relative, records));
  return results.sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'));
}

export async function readFilePayload(relative: string) {
  const file = await readEntry(relative); const full = absolutePath(relative);
  if (file.kind === 'md' || file.kind === 'txt' || file.kind === 'html') return { file, content: await fs.readFile(full, 'utf8') };
  return { file, url: `/api/blob?path=${encodeURIComponent(file.path)}` };
}

export async function atomicWrite(file: string, content: string | Buffer): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, content); await fs.rename(temp, file);
}

export async function appendWikiLog(action: string): Promise<void> {
  const logPath = path.join(WIKI_ROOT, 'wiki', '_log.md');
  if (!(await exists(logPath))) return;
  const now = new Date(); const stamp = now.toISOString().slice(0, 10); let raw = await fs.readFile(logPath, 'utf8');
  raw = raw.replace(/^updated: .*$/m, `updated: ${stamp}`);
  raw = `${raw.trim()}\n\n- ${stamp} Web 查看端：${action}\n`;
  await atomicWrite(logPath, raw);
}

export async function updateMarkdownStatus(relative: string, status: InboxStatus): Promise<void> {
  const full = absolutePath(relative); const raw = await fs.readFile(full, 'utf8'); const parsed = matter(raw);
  parsed.data.status = status; await atomicWrite(full, matter.stringify(parsed.content, parsed.data));
}

export function serializeFrontmatter(data: Record<string, unknown>, body: string): string {
  return matter.stringify(body, data, { language: 'yaml', engines: { yaml: { parse: YAML.parse, stringify: YAML.stringify } } });
}
