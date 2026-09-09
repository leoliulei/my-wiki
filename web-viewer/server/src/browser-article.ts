import http from 'node:http';
import https from 'node:https';
import sanitizeHtml from 'sanitize-html';
import { MAX_FILE_SIZE } from './config.js';
import { absolutePath, atomicWrite, exists, hash, readInboxManifest, sanitizeName, uniquePath, writeInboxManifest } from './files.js';
import { resolvePublicAddress, pinnedLookupForAddress } from './downloader.js';

const MAX_ARTICLE_HTML_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_SIZE = 12 * 1024 * 1024;
const MAX_IMAGES = 80;
const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
};

export interface BrowserArticleInput {
  title: string;
  author?: string;
  publishedAt?: string;
  sourceUrl: string;
  html: string;
}

interface ImageResult {
  originalUrl: string;
  dataUrl?: string;
}

function error(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

export function validateBrowserArticleInput(value: unknown): BrowserArticleInput {
  const input = value as Partial<BrowserArticleInput> | null;
  if (!input || typeof input !== 'object') throw error('文章数据格式无效', 400);
  const title = sanitizeName(String(input.title || '')).trim();
  const html = String(input.html || '').trim();
  let source: URL;
  try { source = new URL(String(input.sourceUrl || '')); } catch { throw error('文章来源网址无效', 400); }
  if (source.protocol !== 'https:' || source.hostname !== 'mp.weixin.qq.com' || !(source.pathname === '/s' || source.pathname.startsWith('/s/'))) throw error('浏览器收藏接口只接受微信公众号文章页', 400);
  if (!title || !html) throw error('文章标题和正文不能为空', 400);
  if (Buffer.byteLength(html, 'utf8') > MAX_ARTICLE_HTML_SIZE) throw error('文章正文超过 5MB 上限', 413);
  return {
    title,
    sourceUrl: source.toString(),
    html,
    author: sanitizeName(String(input.author || ''), '').trim().slice(0, 120) || undefined,
    publishedAt: String(input.publishedAt || '').trim().slice(0, 40) || undefined,
  };
}

export function cleanBrowserArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'article', 'section', 'div', 'p', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'pre', 'code', 'hr', 'br',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'figure', 'figcaption', 'img', 'a',
    ],
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'title', 'rel', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'data'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'], a: ['http', 'https'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attribs) => ({ tagName: 'a', attribs: { ...attribs, rel: 'noreferrer noopener', target: '_blank' } }),
    },
    exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
  });
}

function requestImage(target: URL, signal: AbortSignal): Promise<{ response: http.IncomingMessage; finalUrl: URL }> {
  return new Promise(async (resolve, reject) => {
    let resolved: { address: string; family: number };
    try { resolved = await resolvePublicAddress(target.hostname); } catch (cause) { reject(cause); return; }
    const transport = target.protocol === 'https:' ? https : http;
    const request = transport.request(target, {
      method: 'GET',
      headers: { 'User-Agent': 'my-wiki-local-viewer/1.0', Accept: 'image/png,image/jpeg,image/gif,image/webp', Referer: 'https://mp.weixin.qq.com/' },
      timeout: 20_000,
      lookup: pinnedLookupForAddress(resolved),
      servername: target.hostname,
    }, (response) => resolve({ response, finalUrl: target }));
    const abort = () => request.destroy(Object.assign(new Error('图片下载已取消'), { name: 'AbortError' }));
    signal.addEventListener('abort', abort, { once: true });
    request.on('timeout', () => request.destroy(new Error('图片下载超时')));
    request.on('error', reject);
    request.end();
  });
}

async function downloadImage(source: string, signal: AbortSignal): Promise<ImageResult> {
  let current: URL;
  const requestUrl = source.replace(/&amp;/gi, '&');
  try { current = new URL(requestUrl); } catch { return { originalUrl: source }; }
  if (!['http:', 'https:'].includes(current.protocol)) return { originalUrl: source };
  let response: http.IncomingMessage | undefined;
  for (let redirect = 0; redirect <= 5; redirect += 1) {
    const result = await requestImage(current, signal);
    response = result.response;
    if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      response.resume();
      if (redirect === 5) throw new Error('图片重定向次数超过上限');
      current = new URL(response.headers.location, current);
      continue;
    }
    break;
  }
  if (!response || (response.statusCode || 0) < 200 || (response.statusCode || 0) >= 300) {
    response?.resume(); return { originalUrl: source };
  }
  const contentType = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const mime = IMAGE_TYPES[contentType];
  const declared = Number(response.headers['content-length'] || 0);
  if (!mime || !Number.isFinite(declared) || declared < 0 || declared > MAX_IMAGE_SIZE) { response.resume(); return { originalUrl: source }; }
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const raw of response) {
    const chunk = Buffer.from(raw); bytes += chunk.length;
    if (bytes > MAX_IMAGE_SIZE) { response.destroy(); return { originalUrl: source }; }
    chunks.push(chunk);
  }
  if (!bytes) return { originalUrl: source };
  return { originalUrl: source, dataUrl: `data:${mime};base64,${Buffer.concat(chunks).toString('base64')}` };
}

function imageUrls(html: string): { urls: string[]; omitted: number } {
  const all = [...new Set([...html.matchAll(/<img\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)')[^>]*>/gi)]
    .map((match) => match[1] || match[2]).filter((value) => /^https?:\/\//i.test(value)))];
  return { urls: all.slice(0, MAX_IMAGES), omitted: Math.max(0, all.length - MAX_IMAGES) };
}

export async function localizeArticleImages(html: string, signal = AbortSignal.timeout(120_000)): Promise<{ html: string; failed: number; total: number }> {
  const { urls, omitted } = imageUrls(html);
  const results: ImageResult[] = [];
  for (let index = 0; index < urls.length; index += 4) {
    const batch = urls.slice(index, index + 4);
    results.push(...await Promise.all(batch.map((url) => downloadImage(url, signal).catch(() => ({ originalUrl: url })))));
  }
  let output = html; let failed = omitted;
  for (const result of results) {
    if (!result.dataUrl) { failed += 1; continue; }
    output = output.split(result.originalUrl).join(result.dataUrl);
  }
  return { html: output, failed, total: urls.length + omitted };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
}

export function articleDocument(input: BrowserArticleInput, body: string, imageSummary: { failed: number; total: number }): string {
  const metadata = [input.author, input.publishedAt].filter((value): value is string => Boolean(value)).map(escapeHtml).join(' · ');
  const warning = imageSummary.failed ? `<p class="capture-warning">${imageSummary.failed} / ${imageSummary.total} 张图片未能本地化，保留原地址。</p>` : '';
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(input.title)}</title>
<style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f5f4ef;color:#242a2f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;line-height:1.8}.page{max-width:860px;margin:0 auto;padding:48px 28px 80px}.article{background:#fff;border-radius:16px;padding:48px clamp(22px,6vw,64px);box-shadow:0 10px 36px rgba(32,45,55,.06)}h1{font-size:clamp(28px,5vw,40px);line-height:1.25;margin:0 0 14px}.meta{color:#74808a;font-size:14px;margin-bottom:32px}.source{margin-top:42px;padding-top:20px;border-top:1px solid #e5e7e8;font-size:13px;color:#77828b;word-break:break-all}.source a{color:#3f6f78}img{max-width:100%!important;height:auto!important;display:block;margin:20px auto}pre{overflow:auto;background:#f4f6f7;padding:16px;border-radius:8px}blockquote{margin:20px 0;padding:4px 18px;border-left:3px solid #89a9a2;color:#53625f}table{border-collapse:collapse;max-width:100%;display:block;overflow:auto}th,td{border:1px solid #dde2e4;padding:7px 10px}.capture-warning{padding:10px 14px;border-radius:8px;background:#fff6df;color:#765c1c;font-size:13px}@media(max-width:600px){.page{padding:0}.article{border-radius:0;padding:28px 18px 52px;box-shadow:none}}
</style></head><body><main class="page"><article class="article"><header><h1>${escapeHtml(input.title)}</h1>${metadata ? `<div class="meta">${metadata}</div>` : ''}${warning}</header><section class="content">${body}</section><footer class="source">来源：<a href="${escapeHtml(input.sourceUrl)}" rel="noreferrer noopener">${escapeHtml(input.sourceUrl)}</a></footer></article></main></body></html>`;
}

export function browserArticleFingerprint(input: BrowserArticleInput, cleanHtml: string): string {
  return hash(JSON.stringify({
    sourceUrl: input.sourceUrl,
    title: input.title,
    author: input.author || '',
    publishedAt: input.publishedAt || '',
    html: cleanHtml,
  }));
}

function localDate(): string {
  return new Date().toLocaleDateString('en-CA');
}

export async function saveBrowserArticle(value: unknown): Promise<{ path: string; duplicate: boolean; images: { total: number; failed: number } }> {
  const input = validateBrowserArticleInput(value);
  const clean = cleanBrowserArticleHtml(input.html);
  if (clean.replace(/<[^>]+>/g, '').trim().length < 20) throw error('未提取到有效文章正文，请确认当前页面是完整的微信文章', 400);
  const contentSha256 = browserArticleFingerprint(input, clean);
  const records = await readInboxManifest();
  const duplicate = records.find((item) => item.contentSha256 === contentSha256 && item.path);
  if (duplicate && await exists(absolutePath(duplicate.path))) return { path: duplicate.path, duplicate: true, images: { total: 0, failed: 0 } };
  const localized = await localizeArticleImages(clean);
  const document = articleDocument(input, localized.html, localized);
  if (Buffer.byteLength(document) > MAX_FILE_SIZE) throw error('文章和图片合计超过 50MB 上限', 413);
  const sha256 = hash(document);
  const relative = await uniquePath('inbox/files', `${localDate()}-${sanitizeName(input.title)}.html`);
  await atomicWrite(absolutePath(relative), document);
  records.push({ path: relative, title: input.title, sourceUrl: input.sourceUrl, finalUrl: input.sourceUrl, fetchedAt: new Date().toISOString(), httpStatus: 200, contentType: 'text/html', size: Buffer.byteLength(document), sha256, contentSha256, status: localized.failed ? 'review' : 'inbox' });
  try { await writeInboxManifest(records); }
  catch (cause) { await import('node:fs/promises').then((fs) => fs.rm(absolutePath(relative), { force: true })); throw cause; }
  return { path: relative, duplicate: false, images: { total: localized.total, failed: localized.failed } };
}
