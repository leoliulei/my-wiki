import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listEntries, readFilePayload, type FileEntry } from '../server/src/files.js';
import type { DashboardData, StaticSiteData, TabInfo, TreeNode } from '../client/src/types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '..');
const staticRoot = path.join(appRoot, 'static-generated');
const assetsRoot = path.join(staticRoot, 'content');
const allowedPrefixes = ['raw/', 'wiki/'];

function trackedFiles(): Set<string> {
  const output = execFileSync('git', ['ls-files', '-z', '--', 'raw', 'wiki'], { cwd: repoRoot });
  return new Set(output.toString('utf8').split('\0').filter(Boolean).map((value) => value.replaceAll('\\', '/')));
}
function treeFrom(files: FileEntry[]): TreeNode[] {
  return (['raw', 'wiki'] as const).map((zone) => {
    const root: TreeNode = { name: zone, path: zone, type: 'directory', zone, children: [] };
    for (const file of files.filter((entry) => entry.zone === zone)) {
      const parts = file.path.split('/').slice(1); let cursor = root;
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        let node = cursor.children!.find((item) => item.name === part && item.type === (isFile ? 'file' : 'directory'));
        if (!node) {
          const nodePath = [zone, ...parts.slice(0, index + 1)].join('/');
          node = isFile ? { name: part, path: nodePath, type: 'file', zone, file } : { name: part, path: nodePath, type: 'directory', zone, children: [] };
          cursor.children!.push(node);
        }
        cursor = node;
      });
    }
    const sort = (node: TreeNode) => { if (!node.children) return; node.children.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name, 'zh-CN') : a.type === 'directory' ? -1 : 1); node.children.forEach(sort); };
    sort(root); return root;
  });
}
const tabDefinitions = [
  ['raw', '原始', '不可变原始资料'], ['summary', '摘要', '逐篇资料摘要'], ['entity', '实体', '人物、组织、产品与技术'],
  ['concept', '概念', '跨资料提炼的概念'], ['comparison', '对比', '横向评测与比较'], ['synthesis', '综述', '综述与综合观点'],
] as const;
function matches(file: FileEntry, key: string) {
  if (key === 'raw') return file.zone === 'raw'; if (key === 'synthesis') return ['overview', 'synthesis'].includes(file.category); return file.category === key;
}

await fs.rm(staticRoot, { recursive: true, force: true });
await fs.mkdir(assetsRoot, { recursive: true });
const tracked = trackedFiles();
const all = await listEntries();
const files = all.filter((file) => tracked.has(file.path) && allowedPrefixes.some((prefix) => file.path.startsWith(prefix))).map((file) => ({ ...file, editable: false }));
const payloads: StaticSiteData['payloads'] = {}; const searchText: Record<string, string> = {};
for (const file of files) {
  const payload = await readFilePayload(file.path); searchText[file.path] = `${file.title} ${file.path} ${payload.content || ''}`;
  if (payload.content !== undefined) payloads[file.path] = { file, content: payload.content };
  else {
    const publicPath = `content/${file.path}`; const destination = path.join(staticRoot, publicPath); await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(path.join(repoRoot, file.path), destination); payloads[file.path] = { file, url: publicPath };
  }
}
const tags = new Map<string, number>();
for (const file of files) for (const tag of Array.isArray(file.frontmatter?.tags) ? file.frontmatter.tags : []) tags.set(String(tag), (tags.get(String(tag)) || 0) + 1);
const dashboard: DashboardData = {
  counts: { wiki: files.filter((file) => file.zone === 'wiki' && !file.name.startsWith('_')).length, raw: files.filter((file) => file.zone === 'raw').length, inbox: 0, tags: tags.size },
  recent: files.filter((file) => file.zone === 'wiki' && file.kind === 'md' && !file.name.startsWith('_')).sort((a, b) => String(b.frontmatter?.updated || '').localeCompare(String(a.frontmatter?.updated || ''))).slice(0, 6),
  tags: [...tags].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN')).slice(0, 20),
  indexAvailable: files.some((file) => file.path === 'wiki/_index.md'),
};
const tabs: TabInfo[] = tabDefinitions.map(([key, label, description]) => ({ key, label, description, count: files.filter((file) => matches(file, key)).length }));
const data: StaticSiteData = { generatedAt: new Date().toISOString(), rootName: path.basename(repoRoot), files, tree: treeFrom(files), dashboard, tabs, payloads, searchText };
await fs.mkdir(path.join(staticRoot, 'data'), { recursive: true });
await fs.writeFile(path.join(staticRoot, 'data/site-data.json'), JSON.stringify(data));
await fs.writeFile(path.join(staticRoot, '.nojekyll'), '');
console.log(`Static data generated: ${files.length} tracked files, ${Object.keys(payloads).length} payloads.`);
