import type { ApiErrorBody, DashboardData, FilePayload, FileEntry, SearchResult, StaticSiteData, TabInfo, TreeNode } from './types';

let writeToken = '';
let staticDataPromise: Promise<StaticSiteData> | null = null;

export const isStaticMode = import.meta.env.VITE_STATIC_MODE === 'true';
const baseUrl = import.meta.env.BASE_URL || '/';
export function publicAssetUrl(relativePath: string) {
  return `${baseUrl}${relativePath.replace(/^\/+/, '')}`;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error || `请求失败（${status}）`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (init?.method && !['GET', 'HEAD'].includes(init.method.toUpperCase())) headers.set('X-Write-Token', writeToken);
  const response = await fetch(url, { ...init, headers });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new ApiError(response.status, typeof body === 'string' ? { error: body } : body);
  return body as T;
}

async function staticData(): Promise<StaticSiteData> {
  staticDataPromise ||= fetch(publicAssetUrl('data/site-data.json')).then(async (response) => {
    if (!response.ok) throw new ApiError(response.status, { error: '静态知识库数据加载失败' });
    return response.json() as Promise<StaticSiteData>;
  });
  return staticDataPromise;
}
function readonlyError(): never { throw new ApiError(405, { error: 'GitHub Pages 为只读模式，请在本地启动完整模式后执行写操作' }); }

export async function bootstrap() {
  if (isStaticMode) { const data = await staticData(); return { token: '', rootName: data.rootName, readOnly: true }; }
  const result = await request<{ token: string; rootName: string; readOnly?: boolean }>('/api/bootstrap');
  writeToken = result.token;
  return result;
}

export const api = {
  tree: async () => isStaticMode ? (({ tree, files }) => ({ tree, files }))(await staticData()) : request<{ tree: TreeNode[]; files: FileEntry[] }>('/api/tree'),
  dashboard: async () => isStaticMode ? (await staticData()).dashboard : request<DashboardData>('/api/dashboard'),
  tabs: async () => isStaticMode ? { tabs: (await staticData()).tabs } : request<{ tabs: TabInfo[] }>('/api/tabs'),
  file: async (path: string) => {
    if (!isStaticMode) return request<FilePayload>(`/api/file?path=${encodeURIComponent(path)}`);
    const data = await staticData(); const payload = data.payloads[path];
    if (!payload) throw new ApiError(404, { error: '静态页面中没有该文件' });
    return payload.url ? { ...payload, url: publicAssetUrl(payload.url) } : payload;
  },
  search: async (query: string) => {
    if (!isStaticMode) return request<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await staticData(); const needle = query.trim().toLocaleLowerCase('zh-CN');
    if (!needle) return { results: [] };
    const results: SearchResult[] = [];
    for (const file of data.files) {
      const text = data.searchText[file.path] || `${file.title} ${file.path}`; const index = text.toLocaleLowerCase('zh-CN').indexOf(needle);
      if (index < 0) continue;
      results.push({ ...file, snippet: text.slice(Math.max(0, index - 36), index + needle.length + 72).replace(/\s+/g, ' ') });
    }
    return { results: results.slice(0, 50) };
  },
  saveFile: (path: string, content: string, version: string, force = false) => isStaticMode ? Promise.reject(readonlyError()) : request<FilePayload>('/api/file', { method: 'PUT', body: JSON.stringify({ path, content, version, force }) }),
  createFile: (payload: { title: string; type: string }) => isStaticMode ? Promise.reject(readonlyError()) : request<FilePayload>('/api/file', { method: 'POST', body: JSON.stringify(payload) }),
  renameFile: (path: string, title: string) => isStaticMode ? Promise.reject(readonlyError()) : request<{ path: string }>('/api/file/rename', { method: 'POST', body: JSON.stringify({ path, title }) }),
  deleteFile: (path: string) => isStaticMode ? Promise.reject(readonlyError()) : request<{ ok: boolean }>('/api/file', { method: 'DELETE', body: JSON.stringify({ path }) }),
  saveCopy: (title: string, content: string) => isStaticMode ? Promise.reject(readonlyError()) : request<FilePayload>('/api/file/copy', { method: 'POST', body: JSON.stringify({ title, content }) }),
  uploadInbox: (file: File) => { if (isStaticMode) return Promise.reject(readonlyError()); const data = new FormData(); data.append('file', file); return request<FilePayload>('/api/inbox/upload', { method: 'POST', body: data }); },
  collectText: (payload: { title: string; text: string; url?: string }) => isStaticMode ? Promise.reject(readonlyError()) : request<FilePayload>('/api/inbox/text', { method: 'POST', body: JSON.stringify(payload) }),
  startUrlFetch: (url: string) => isStaticMode ? Promise.reject(readonlyError()) : request<{ id: string; state: string; downloaded: number; total?: number }>('/api/inbox/url', { method: 'POST', body: JSON.stringify({ url }) }),
  urlFetchStatus: (id: string) => request<{ id: string; state: string; downloaded: number; total?: number; error?: string; result?: { path: string; duplicate: boolean; status: string } }>(`/api/inbox/url/${encodeURIComponent(id)}`),
  cancelUrlFetch: (id: string) => isStaticMode ? Promise.reject(readonlyError()) : request<{ ok: boolean }>(`/api/inbox/url/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setInboxStatus: (path: string, status: 'inbox' | 'review' | 'archived') => isStaticMode ? Promise.reject(readonlyError()) : request<FilePayload>('/api/inbox/status', { method: 'PATCH', body: JSON.stringify({ path, status }) }),
  deleteArchived: () => isStaticMode ? Promise.reject(readonlyError()) : request<{ deleted: number }>('/api/inbox/archived', { method: 'DELETE' }),
  uploadImage: (path: string, file: File) => { if (isStaticMode) return Promise.reject(readonlyError()); const data = new FormData(); data.append('file', file); data.append('path', path); return request<{ relativePath: string }>('/api/assets', { method: 'POST', body: data }); },
};
