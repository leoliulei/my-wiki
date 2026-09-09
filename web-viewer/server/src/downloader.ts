import dns from 'node:dns/promises';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net, { type LookupFunction } from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { MAX_FILE_SIZE } from './config.js';
import { absolutePath, atomicWrite, exists, hash, readInboxManifest, sanitizeName, uniquePath, writeInboxManifest, type InboxRecord } from './files.js';

const CONTENT_TYPES: Record<string, string> = {
  'text/html': '.html', 'text/markdown': '.md', 'text/plain': '.txt', 'application/pdf': '.pdf',
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp',
};
const CLOUD_METADATA = new Set(['169.254.169.254', '100.100.100.200']);

export type DownloadState = 'connecting' | 'downloading' | 'done' | 'error' | 'cancelled';
export interface DownloadJob {
  id: string; sourceUrl: string; state: DownloadState; downloaded: number; total?: number;
  error?: string; result?: { path: string; duplicate: boolean; status: InboxRecord['status'] };
  controller: AbortController;
}
export const jobs = new Map<string, DownloadJob>();

function isPublicIp(address: string): boolean {
  if (CLOUD_METADATA.has(address)) return false;
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    return true;
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    if (normalized === '::' || normalized === '::1' || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return false;
    if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('ff')) return false;
    if (normalized.startsWith('2001:db8:')) return false;
    if (normalized.startsWith('::ffff:')) return isPublicIp(normalized.slice(7));
    return true;
  }
  return false;
}

async function resolvePublic(hostname: string) {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) throw new Error('出于安全原因，不能访问本机或内网地址');
  const records = net.isIP(hostname) ? [{ address: hostname, family: net.isIP(hostname) }] : await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((item) => !isPublicIp(item.address))) throw new Error('出于安全原因，目标解析到私网、环回或保留地址');
  return records[0];
}

function pinnedLookup(resolved: { address: string; family: number }): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) callback(null, [{ address: resolved.address, family: resolved.family }]);
    else callback(null, resolved.address, resolved.family);
  };
}

function requestOnce(target: URL, signal: AbortSignal, onProgress: (bytes: number, total?: number) => void): Promise<{ response: http.IncomingMessage; finalUrl: URL; address: string }> {
  return new Promise(async (resolve, reject) => {
    let resolved: { address: string; family: number };
    try { resolved = await resolvePublic(target.hostname); } catch (error) { reject(error); return; }
    const transport = target.protocol === 'https:' ? https : http;
    const req = transport.request(target, {
      method: 'GET', headers: { 'User-Agent': 'my-wiki-local-viewer/1.0', Accept: 'text/html,text/plain,text/markdown,application/pdf,image/*' },
      timeout: 20_000, lookup: pinnedLookup(resolved),
      servername: target.hostname,
    }, (response) => {
      const total = Number(response.headers['content-length'] || 0) || undefined;
      onProgress(0, total); resolve({ response, finalUrl: target, address: resolved.address });
    });
    const abort = () => req.destroy(Object.assign(new Error('用户已取消'), { name: 'AbortError' }));
    signal.addEventListener('abort', abort, { once: true });
    req.on('timeout', () => req.destroy(new Error('连接或响应超时')));
    req.on('error', reject);
    req.end();
  });
}

function fileNameFromHeaders(response: http.IncomingMessage): string | undefined {
  const disposition = response.headers['content-disposition'];
  if (!disposition) return undefined;
  const utf = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf) { try { return decodeURIComponent(utf[1]); } catch { return utf[1]; } }
  return disposition.match(/filename="?([^";]+)"?/i)?.[1];
}

function suspiciousHtml(text: string): boolean {
  const lower = text.toLowerCase();
  return ['captcha', 'verify you are human', 'access denied', 'login', 'sign in', '验证码', '请登录', '访问受限'].some((term) => lower.includes(term));
}

async function perform(job: DownloadJob) {
  let current: URL;
  try { current = new URL(job.sourceUrl); } catch { throw new Error('网址格式无效'); }
  if (!['http:', 'https:'].includes(current.protocol)) throw new Error('只支持 HTTP/HTTPS 地址');
  let response: http.IncomingMessage | null = null;
  for (let redirect = 0; redirect <= 5; redirect++) {
    job.state = 'connecting';
    const result = await requestOnce(current, job.controller.signal, (bytes, total) => { job.downloaded = bytes; job.total = total; });
    response = result.response;
    if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      response.resume();
      if (redirect === 5) throw new Error('重定向次数超过上限');
      current = new URL(response.headers.location, current); continue;
    }
    break;
  }
  if (!response) throw new Error('目标没有返回响应');
  const statusCode = response.statusCode || 0;
  if (statusCode < 200 || statusCode >= 300) { response.resume(); throw new Error(`目标返回 HTTP ${statusCode}`); }
  const contentType = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const extension = CONTENT_TYPES[contentType];
  if (!extension) { response.resume(); throw new Error(`响应类型不受支持：${contentType || '未知'}`); }
  const declared = Number(response.headers['content-length'] || 0);
  if (declared > MAX_FILE_SIZE) { response.resume(); throw new Error('文件超过 50MB 上限'); }

  const headerName = fileNameFromHeaders(response);
  const pathName = decodeURIComponent(path.posix.basename(current.pathname));
  let base = sanitizeName(headerName || (pathName && pathName !== '/' ? pathName : current.hostname));
  if (!path.extname(base)) base += extension;
  if (!base.toLowerCase().endsWith(extension) && !CONTENT_TYPES[contentType]?.includes(path.extname(base).toLowerCase())) base += extension;

  const filesDir = absolutePath('inbox/files'); await fsp.mkdir(filesDir, { recursive: true });
  const part = path.join(filesDir, `.download-${job.id}.part`);
  const digest = crypto.createHash('sha256'); let bytes = 0; const chunks: Buffer[] = [];
  job.state = 'downloading';
  try {
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(part, { flags: 'wx' });
      const abort = () => { response?.destroy(); output.destroy(Object.assign(new Error('用户已取消'), { name: 'AbortError' })); };
      job.controller.signal.addEventListener('abort', abort, { once: true });
      response!.on('data', (chunk: Buffer) => {
        bytes += chunk.length; if (bytes > MAX_FILE_SIZE) response!.destroy(new Error('文件超过 50MB 上限'));
        digest.update(chunk); if (contentType === 'text/html' && chunks.reduce((n, c) => n + c.length, 0) < 262_144) chunks.push(chunk);
        job.downloaded = bytes;
      });
      response!.pipe(output);
      output.on('finish', resolve); output.on('error', reject); response!.on('error', reject);
    });
    if (!bytes) throw new Error('目标返回空响应');
    const sha256 = digest.digest('hex'); const records = await readInboxManifest();
    const duplicate = records.find((item) => item.sha256 === sha256 && item.path && exists(absolutePath(item.path)));
    if (duplicate) {
      await fsp.rm(part, { force: true }); job.result = { path: duplicate.path, duplicate: true, status: duplicate.status }; job.state = 'done'; return;
    }
    const relative = await uniquePath('inbox/files', base); const full = absolutePath(relative);
    await fsp.rename(part, full);
    const status: InboxRecord['status'] = contentType === 'text/html' && suspiciousHtml(Buffer.concat(chunks).toString('utf8')) ? 'review' : 'inbox';
    records.push({ path: relative, sourceUrl: job.sourceUrl, finalUrl: current.toString(), fetchedAt: new Date().toISOString(), httpStatus: statusCode, contentType, size: bytes, sha256, status });
    try { await writeInboxManifest(records); }
    catch (error) { await fsp.rm(full, { force: true }); throw error; }
    job.result = { path: relative, duplicate: false, status }; job.state = 'done';
  } catch (error) {
    await fsp.rm(part, { force: true }); throw error;
  }
}

export function createPinnedLookupForTest(address: string, family: number): LookupFunction {
  return pinnedLookup({ address, family });
}

export function startDownload(sourceUrl: string): DownloadJob {
  const id = crypto.randomUUID();
  const job: DownloadJob = { id, sourceUrl, state: 'connecting', downloaded: 0, controller: new AbortController() };
  jobs.set(id, job);
  void perform(job).catch((error: Error) => {
    job.state = error.name === 'AbortError' ? 'cancelled' : 'error'; job.error = error.message;
  });
  return job;
}

export function publicJob(job: DownloadJob) {
  const { controller: _controller, ...safe } = job; return safe;
}
