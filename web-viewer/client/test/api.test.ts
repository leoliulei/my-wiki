import { afterEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function loadApiWith(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock);
  const { api } = await import('../src/api.js');
  return api;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('写操作令牌恢复', () => {
  it('令牌失效时重新 bootstrap 并只重试一次原写请求', async () => {
    const responses = [
      jsonResponse({ error: '写操作令牌无效' }, 403),
      jsonResponse({ token: 'new-token', rootName: 'my-wiki' }),
      jsonResponse({ id: 'job-1', state: 'connecting', downloaded: 0 }, 202),
    ];
    const fetchMock = vi.fn(async () => {
      const response = responses.shift();
      if (!response) throw new Error('unexpected fetch');
      return response;
    });
    const api = await loadApiWith(fetchMock);

    await expect(api.startUrlFetch('https://example.com/article')).resolves.toMatchObject({ id: 'job-1' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/inbox/url');
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('X-Write-Token')).toBe('');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/bootstrap');
    expect(fetchMock.mock.calls[2][0]).toBe('/api/inbox/url');
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get('X-Write-Token')).toBe('new-token');
  });

  it('并发写请求共享同一次令牌刷新', async () => {
    let bootstrapCalls = 0;
    let writeCalls = 0;
    let releaseBootstrap!: () => void;
    const bootstrapGate = new Promise<void>((resolve) => { releaseBootstrap = resolve; });
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url) === '/api/bootstrap') {
        bootstrapCalls += 1;
        await bootstrapGate;
        return jsonResponse({ token: 'shared-token', rootName: 'my-wiki' });
      }
      writeCalls += 1;
      const token = new Headers(init?.headers).get('X-Write-Token');
      return token === 'shared-token'
        ? jsonResponse({ file: { path: `inbox/test-${writeCalls}.md` } }, 201)
        : jsonResponse({ error: '写操作令牌无效' }, 403);
    });
    const api = await loadApiWith(fetchMock);

    const operations = Promise.all([
      api.collectText({ title: '并发一', text: '内容一' }),
      api.collectText({ title: '并发二', text: '内容二' }),
    ]);
    await vi.waitFor(() => expect(writeCalls).toBe(2));
    releaseBootstrap();
    await operations;
    expect(bootstrapCalls).toBe(1);
    expect(writeCalls).toBe(4);
  });

  it('其他 403 原样抛出且不刷新令牌', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: '只能修改暂存项状态' }, 403));
    const api = await loadApiWith(fetchMock);

    await expect(api.setInboxStatus('wiki/test.md', 'archived')).rejects.toMatchObject({
      status: 403,
      message: '只能修改暂存项状态',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
