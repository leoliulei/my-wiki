import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import crypto from 'node:crypto';
import open from 'open';
import { ALLOWED_EXTENSIONS, CLIENT_DIST, HOST, MAX_FILE_SIZE, PORT, WIKI_ROOT, WRITE_TOKEN } from './config.js';
import {
  absolutePath, appendWikiLog, atomicWrite, exists, hash, kindOf, listEntries, normalizeRelative, readEntry,
  readFilePayload, readInboxManifest, sanitizeName, slugName, uniquePath, updateMarkdownStatus, writeInboxManifest,
  type InboxStatus,
} from './files.js';
import { jobs, publicJob, startDownload } from './downloader.js';
import { saveBrowserArticle } from './browser-article.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } });
const writeLock: { current: Promise<void> } = { current: Promise.resolve() };
const withWriteLock = async <T>(task: () => Promise<T>): Promise<T> => {
  const prior = writeLock.current; let release!: () => void;
  writeLock.current = new Promise<void>((resolve) => { release = resolve; });
  await prior; try { return await task(); } finally { release(); }
};

app.disable('x-powered-by');
app.use(express.json({ limit: '6mb' }));
app.use((_, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});

function requireWriteToken(request: Request, response: Response, next: NextFunction) {
  if (request.header('X-Write-Token') !== WRITE_TOKEN) { response.status(403).json({ error: '写操作令牌无效' }); return; }
  next();
}
app.get('/api/bootstrap', (_, response) => response.json({ token: WRITE_TOKEN, rootName: path.basename(WIKI_ROOT) }));
app.use('/api', (request, response, next) => {
  if (!['GET', 'HEAD'].includes(request.method)) return requireWriteToken(request, response, next);
  next();
});

function treeFrom(files: Awaited<ReturnType<typeof listEntries>>) {
  return (['inbox', 'raw', 'wiki'] as const).map((zone) => {
    const root: any = { name: zone, path: zone, type: 'directory', zone, children: [] };
    for (const file of files.filter((entry) => entry.zone === zone)) {
      const parts = file.path.split('/').slice(1); let cursor = root;
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        let node = cursor.children.find((item: any) => item.name === part && item.type === (isFile ? 'file' : 'directory'));
        if (!node) {
          const nodePath = [zone, ...parts.slice(0, index + 1)].join('/');
          node = isFile ? { name: part, path: nodePath, type: 'file', zone, file } : { name: part, path: nodePath, type: 'directory', zone, children: [] };
          cursor.children.push(node);
        }
        cursor = node;
      });
    }
    const sort = (node: any) => { if (!node.children) return; node.children.sort((a: any, b: any) => a.type === b.type ? a.name.localeCompare(b.name, 'zh-CN') : a.type === 'directory' ? -1 : 1); node.children.forEach(sort); };
    sort(root); return root;
  });
}

const tabConfig = [
  ['raw', '原始', '不可变原始资料'], ['summary', '摘要', '逐篇资料摘要'], ['entity', '实体', '人物、组织、产品与技术'],
  ['concept', '概念', '跨资料提炼的概念'], ['comparison', '对比', '横向评测与比较'], ['synthesis', '综述', '综述与综合观点'],
  ['archived', '归档', '已完成整理的暂存项'], ['inbox', '暂存', '待 Agent 整理的收藏'],
] as const;
function tabMatch(file: Awaited<ReturnType<typeof listEntries>>[number], key: string) {
  if (key === 'raw') return file.zone === 'raw';
  if (key === 'inbox') return file.zone === 'inbox' && file.path !== 'inbox/_inbox.md' && file.status !== 'archived';
  if (key === 'archived') return file.zone === 'inbox' && file.status === 'archived';
  if (key === 'synthesis') return file.category === 'overview' || file.category === 'synthesis';
  return file.category === key;
}

app.get('/api/tree', async (_, response, next) => { try { const files = await listEntries(); response.json({ tree: treeFrom(files), files }); } catch (error) { next(error); } });
app.get('/api/tabs', async (_, response, next) => { try { const files = await listEntries(); response.json({ tabs: tabConfig.map(([key, label, description]) => ({ key, label, description, count: files.filter((file) => tabMatch(file, key)).length })) }); } catch (error) { next(error); } });
app.get('/api/dashboard', async (_, response, next) => {
  try {
    const files = await listEntries(); const tags = new Map<string, number>();
    for (const file of files) for (const tag of Array.isArray(file.frontmatter?.tags) ? file.frontmatter.tags : []) tags.set(String(tag), (tags.get(String(tag)) || 0) + 1);
    const recent = files.filter((file) => file.zone === 'wiki' && file.kind === 'md' && !file.path.endsWith('/_index.md') && !file.path.endsWith('/_log.md'))
      .sort((a, b) => String(b.frontmatter?.updated || '').localeCompare(String(a.frontmatter?.updated || ''))).slice(0, 6);
    response.json({
      counts: { wiki: files.filter((f) => f.zone === 'wiki' && !f.name.startsWith('_')).length, raw: files.filter((f) => f.zone === 'raw').length, inbox: files.filter((f) => f.zone === 'inbox' && f.path !== 'inbox/_inbox.md' && f.status !== 'archived').length, tags: tags.size },
      recent, tags: [...tags].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN')).slice(0, 20),
      indexAvailable: await exists(absolutePath('wiki/_index.md')),
    });
  } catch (error) { next(error); }
});
app.get('/api/file', async (request, response, next) => { try { response.json(await readFilePayload(String(request.query.path || ''))); } catch (error) { next(error); } });
app.get('/api/blob', async (request, response, next) => {
  try {
    const relative = normalizeRelative(String(request.query.path || '')); const file = await readEntry(relative);
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    if (file.kind === 'pdf') response.type('application/pdf');
    else if (file.kind === 'image') response.type(path.extname(file.name));
    else response.type('application/octet-stream');
    response.sendFile(absolutePath(relative));
  } catch (error) { next(error); }
});
app.get('/api/search', async (request, response, next) => {
  try {
    const query = String(request.query.q || '').trim().toLocaleLowerCase('zh-CN'); if (!query) { response.json({ results: [] }); return; }
    const files = await listEntries(); const results = [];
    for (const file of files) {
      let snippet: string | undefined; let hit = `${file.title} ${file.path}`.toLocaleLowerCase('zh-CN').includes(query);
      if (file.kind === 'md') {
        const content = await fs.readFile(absolutePath(file.path), 'utf8'); const index = content.toLocaleLowerCase('zh-CN').indexOf(query);
        if (index >= 0) { hit = true; snippet = content.slice(Math.max(0, index - 36), index + query.length + 72).replace(/\s+/g, ' '); }
      }
      if (hit) results.push({ ...file, snippet });
    }
    response.json({ results: results.slice(0, 50) });
  } catch (error) { next(error); }
});

app.put('/api/file', async (request, response, next) => {
  try {
    const payload = await withWriteLock(async () => {
      const relative = normalizeRelative(request.body.path); if (relative.startsWith('raw/') || path.extname(relative) !== '.md') throw Object.assign(new Error('该文件不可编辑'), { status: 403 });
      const disk = await readFilePayload(relative); if (!request.body.force && request.body.version !== disk.file.version) throw Object.assign(new Error('文件已被外部修改'), { status: 409, code: 'VERSION_CONFLICT', conflict: { diskContent: disk.content, diskVersion: disk.file.version } });
      await atomicWrite(absolutePath(relative), String(request.body.content || ''));
      if (relative.startsWith('wiki/')) await appendWikiLog(`编辑 ${relative}`);
      return readFilePayload(relative);
    });
    response.json(payload);
  } catch (error) { next(error); }
});
app.post('/api/file', async (request, response, next) => {
  try {
    const payload = await withWriteLock(async () => {
      const type = String(request.body.type || 'summary'); const dirs: Record<string, string> = { summary: 'summaries', entity: 'entities', concept: 'concepts', comparison: 'comparisons', overview: 'overviews', synthesis: 'synthesis' };
      if (!dirs[type]) throw Object.assign(new Error('页面类型无效'), { status: 400 });
      const title = sanitizeName(String(request.body.title || '')).trim(); if (!title) throw Object.assign(new Error('请填写标题'), { status: 400 });
      const relative = `wiki/${dirs[type]}/${slugName(title)}.md`; if (await exists(absolutePath(relative))) throw Object.assign(new Error('同名页面已存在'), { status: 409 });
      const date = new Date().toISOString().slice(0, 10); const content = `---\ntype: ${type}\ntitle: ${title}\ncreated: ${date}\nupdated: ${date}\ntags: []\n---\n\n# ${title}\n`;
      await atomicWrite(absolutePath(relative), content); await appendWikiLog(`新建 ${relative}`); return readFilePayload(relative);
    }); response.status(201).json(payload);
  } catch (error) { next(error); }
});
app.post('/api/file/rename', async (request, response, next) => {
  try {
    const result = await withWriteLock(async () => {
      const oldPath = normalizeRelative(request.body.path); if (oldPath.startsWith('raw/') || path.extname(oldPath) !== '.md') throw Object.assign(new Error('该文件不可重命名'), { status: 403 });
      const title = sanitizeName(String(request.body.title || '')).trim(); if (!title) throw Object.assign(new Error('请填写新标题'), { status: 400 });
      const newPath = path.posix.join(path.posix.dirname(oldPath), `${slugName(title)}.md`); if (newPath !== oldPath && await exists(absolutePath(newPath))) throw Object.assign(new Error('目标文件已存在'), { status: 409 });
      const oldPayload = await readFilePayload(oldPath); const oldTitle = oldPayload.file.title;
      let own = String(oldPayload.content || '').replace(/^title: .*$/m, `title: ${title}`); await atomicWrite(absolutePath(oldPath), own);
      if (oldPath.startsWith('wiki/')) {
        const entries = await listEntries(); const escaped = oldTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        for (const file of entries.filter((f) => f.kind === 'md')) {
          let content = await fs.readFile(absolutePath(file.path), 'utf8');
          const nextContent = content.replace(new RegExp(`\\[\\[${escaped}(?=\\]|\\|)`, 'g'), `[[${title}`);
          if (nextContent !== content) await atomicWrite(absolutePath(file.path), nextContent);
        }
      }
      if (newPath !== oldPath) await fs.rename(absolutePath(oldPath), absolutePath(newPath));
      if (oldPath.startsWith('wiki/')) await appendWikiLog(`重命名 ${oldPath} → ${newPath}`);
      return { path: newPath };
    }); response.json(result);
  } catch (error) { next(error); }
});
app.delete('/api/file', async (request, response, next) => {
  try {
    await withWriteLock(async () => {
      const relative = normalizeRelative(request.body.path); if (relative.startsWith('raw/')) throw Object.assign(new Error('raw 区不可删除'), { status: 403 });
      await fs.rm(absolutePath(relative));
      if (relative.startsWith('wiki/')) await appendWikiLog(`删除 ${relative}`);
      else { const records = await readInboxManifest(); await writeInboxManifest(records.filter((item) => item.path !== relative)); }
    }); response.json({ ok: true });
  } catch (error) { next(error); }
});
app.post('/api/file/copy', async (request, response, next) => {
  try { const payload = await withWriteLock(async () => { const date = new Date().toISOString().slice(0, 10); const relative = await uniquePath('inbox', `${date}-${slugName(String(request.body.title || '恢复草稿'))}-副本.md`); await atomicWrite(absolutePath(relative), String(request.body.content || '')); return readFilePayload(relative); }); response.status(201).json(payload); }
  catch (error) { next(error); }
});

app.post('/api/inbox/upload', upload.single('file'), async (request, response, next) => {
  try {
    if (!request.file) throw Object.assign(new Error('请选择文件'), { status: 400 });
    const ext = path.extname(request.file.originalname).toLowerCase(); if (!ALLOWED_EXTENSIONS.has(ext)) throw Object.assign(new Error(`不支持 ${ext || '未知'} 文件`), { status: 415 });
    const payload = await withWriteLock(async () => {
      const relative = await uniquePath('inbox/files', sanitizeName(request.file!.originalname)); await atomicWrite(absolutePath(relative), request.file!.buffer);
      const records = await readInboxManifest(); records.push({ path: relative, fetchedAt: new Date().toISOString(), contentType: request.file!.mimetype, size: request.file!.size, sha256: hash(request.file!.buffer), status: 'inbox' }); await writeInboxManifest(records);
      return readFilePayload(relative);
    }); response.status(201).json(payload);
  } catch (error) { next(error); }
});
app.post('/api/inbox/text', async (request, response, next) => {
  try {
    const payload = await withWriteLock(async () => {
      const title = sanitizeName(String(request.body.title || '')).trim(); const text = String(request.body.text || '').trim(); if (!title || !text) throw Object.assign(new Error('标题和正文不能为空'), { status: 400 });
      const date = new Date().toISOString().slice(0, 10); const relative = await uniquePath('inbox', `${date}-${slugName(title)}.md`);
      const source = request.body.url ? String(request.body.url) : '粘贴收藏'; const content = matter.stringify(`\n${text}\n`, { type: 'inbox', title, status: 'inbox', source, saved: date, tags: [] });
      await atomicWrite(absolutePath(relative), content); return readFilePayload(relative);
    }); response.status(201).json(payload);
  } catch (error) { next(error); }
});
app.post('/api/inbox/browser-article', async (request, response, next) => {
  try { const result = await withWriteLock(() => saveBrowserArticle(request.body)); response.status(result.duplicate ? 200 : 201).json(result); }
  catch (error) { next(error); }
});
app.post('/api/inbox/url', (request, response, next) => { try { const job = startDownload(String(request.body.url || '')); response.status(202).json(publicJob(job)); } catch (error) { next(error); } });
app.get('/api/inbox/url/:id', (request, response) => { const job = jobs.get(request.params.id); if (!job) { response.status(404).json({ error: '抓取任务不存在' }); return; } response.json(publicJob(job)); });
app.delete('/api/inbox/url/:id', (request, response) => { const job = jobs.get(request.params.id); if (!job) { response.status(404).json({ error: '抓取任务不存在' }); return; } job.controller.abort(); response.json({ ok: true }); });
app.patch('/api/inbox/status', async (request, response, next) => {
  try {
    const payload = await withWriteLock(async () => {
      const relative = normalizeRelative(request.body.path); if (!relative.startsWith('inbox/') || relative === 'inbox/_inbox.md') throw Object.assign(new Error('只能修改暂存项状态'), { status: 403 });
      const status = String(request.body.status) as InboxStatus; if (!['inbox', 'review', 'archived'].includes(status)) throw Object.assign(new Error('状态无效'), { status: 400 });
      if (kindOf(relative) === 'md') await updateMarkdownStatus(relative, status);
      else { const records = await readInboxManifest(); const item = records.find((record) => record.path === relative); if (item) item.status = status; else records.push({ path: relative, status }); await writeInboxManifest(records); }
      return readFilePayload(relative);
    }); response.json(payload);
  } catch (error) { next(error); }
});
app.delete('/api/inbox/archived', async (_, response, next) => {
  try {
    const deleted = await withWriteLock(async () => {
      const entries = await listEntries(); const archived = entries.filter((file) => file.zone === 'inbox' && file.path !== 'inbox/_inbox.md' && file.status === 'archived');
      for (const file of archived) await fs.rm(absolutePath(file.path), { force: true });
      const records = await readInboxManifest(); await writeInboxManifest(records.filter((record) => record.status !== 'archived')); return archived.length;
    }); response.json({ deleted });
  } catch (error) { next(error); }
});
app.post('/api/inbox/copy-to-raw', async (request, response, next) => {
  try {
    const payload = await withWriteLock(async () => {
      const relative = normalizeRelative(request.body.path); if (!relative.startsWith('inbox/') || relative === 'inbox/_inbox.md') throw Object.assign(new Error('只能收录暂存项'), { status: 403 });
      const target = await uniquePath(path.extname(relative).toLowerCase() === '.md' ? 'raw' : 'raw/assets', path.basename(relative)); await fs.copyFile(absolutePath(relative), absolutePath(target), fs.constants.COPYFILE_EXCL); return readFilePayload(target);
    }); response.status(201).json(payload);
  } catch (error) { next(error); }
});
app.post('/api/assets', upload.single('file'), async (request, response, next) => {
  try {
    if (!request.file) throw Object.assign(new Error('请选择图片'), { status: 400 });
    const docPath = normalizeRelative(String(request.body.path || '')); if (docPath.startsWith('raw/') || path.extname(docPath) !== '.md') throw Object.assign(new Error('该文档不可插入图片'), { status: 403 });
    const ext = path.extname(request.file.originalname).toLowerCase(); if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) throw Object.assign(new Error('仅支持常见图片格式'), { status: 415 });
    const dir = docPath.startsWith('wiki/') ? 'wiki/assets' : 'inbox/files'; const relative = await uniquePath(dir, sanitizeName(request.file.originalname)); await atomicWrite(absolutePath(relative), request.file.buffer);
    const from = path.posix.dirname(docPath); response.status(201).json({ relativePath: path.posix.relative(from, relative) });
  } catch (error) { next(error); }
});

app.use(express.static(CLIENT_DIST));
app.use(async (_request, response, next) => { try { response.sendFile(path.join(CLIENT_DIST, 'index.html')); } catch (error) { next(error); } });
app.use((error: any, _request: Request, response: Response, _next: NextFunction) => {
  if (error?.code === 'LIMIT_FILE_SIZE') { response.status(413).json({ error: '文件超过 50MB 上限' }); return; }
  const status = Number(error?.status || (error?.code === 'ENOENT' ? 404 : 500));
  const body: Record<string, unknown> = { error: error?.message || '服务器内部错误' }; if (error?.code) body.code = error.code; if (error?.conflict) body.conflict = error.conflict;
  if (status >= 500) console.error(error); response.status(status).json(body);
});

export function createServer() { return app; }
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, async () => {
    const url = `http://${HOST}:${PORT}`; console.log(`my-wiki Web 查看端已启动：${url}`);
    if (process.argv.includes('--open')) await open(url);
  });
}
