import type { ApiErrorBody, DashboardData, FilePayload, FileEntry, SearchResult, TreeNode } from './types';

let writeToken = '';

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
  if (init?.method && !['GET', 'HEAD'].includes(init.method.toUpperCase())) {
    headers.set('X-Write-Token', writeToken);
  }
  const response = await fetch(url, { ...init, headers });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new ApiError(response.status, typeof body === 'string' ? { error: body } : body);
  }
  return body as T;
}

export async function bootstrap() {
  const result = await request<{ token: string; rootName: string }>('/api/bootstrap');
  writeToken = result.token;
  return result;
}

export const api = {
  tree: () => request<{ tree: TreeNode[]; files: FileEntry[] }>('/api/tree'),
  dashboard: () => request<DashboardData>('/api/dashboard'),
  tabs: () => request<{ tabs: Array<{ key: string; label: string; count: number; description: string }> }>('/api/tabs'),
  file: (path: string) => request<FilePayload>(`/api/file?path=${encodeURIComponent(path)}`),
  search: (query: string) => request<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`),
  saveFile: (path: string, content: string, version: string, force = false) => request<FilePayload>('/api/file', {
    method: 'PUT', body: JSON.stringify({ path, content, version, force }),
  }),
  createFile: (payload: { title: string; type: string }) => request<FilePayload>('/api/file', {
    method: 'POST', body: JSON.stringify(payload),
  }),
  renameFile: (path: string, title: string) => request<{ path: string }>('/api/file/rename', {
    method: 'POST', body: JSON.stringify({ path, title }),
  }),
  deleteFile: (path: string) => request<{ ok: boolean }>('/api/file', {
    method: 'DELETE', body: JSON.stringify({ path }),
  }),
  saveCopy: (title: string, content: string) => request<FilePayload>('/api/file/copy', {
    method: 'POST', body: JSON.stringify({ title, content }),
  }),
  uploadInbox: (file: File) => {
    const data = new FormData(); data.append('file', file);
    return request<FilePayload>('/api/inbox/upload', { method: 'POST', body: data });
  },
  collectText: (payload: { title: string; text: string; url?: string }) => request<FilePayload>('/api/inbox/text', {
    method: 'POST', body: JSON.stringify(payload),
  }),
  startUrlFetch: (url: string) => request<{ id: string; state: string; downloaded: number; total?: number }>('/api/inbox/url', {
    method: 'POST', body: JSON.stringify({ url }),
  }),
  urlFetchStatus: (id: string) => request<{ id: string; state: string; downloaded: number; total?: number; error?: string; result?: { path: string; duplicate: boolean; status: string } }>(`/api/inbox/url/${encodeURIComponent(id)}`),
  cancelUrlFetch: (id: string) => request<{ ok: boolean }>(`/api/inbox/url/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setInboxStatus: (path: string, status: 'inbox' | 'review' | 'archived') => request<FilePayload>('/api/inbox/status', {
    method: 'PATCH', body: JSON.stringify({ path, status }),
  }),
  deleteArchived: () => request<{ deleted: number }>('/api/inbox/archived', { method: 'DELETE' }),
  uploadImage: (path: string, file: File) => {
    const data = new FormData(); data.append('file', file); data.append('path', path);
    return request<{ relativePath: string }>('/api/assets', { method: 'POST', body: data });
  },
};
