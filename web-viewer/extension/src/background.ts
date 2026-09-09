interface SaveMessage {
  type: 'MY_WIKI_SAVE_ARTICLE';
  server: string;
  article: { title: string; author?: string; publishedAt?: string; sourceUrl: string; html: string };
}

function serverUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('本地服务地址必须是 127.0.0.1 或 localhost');
  return url.origin;
}

async function responseBody(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : { error: await response.text() };
}

async function saveArticle(message: SaveMessage) {
  const base = serverUrl(message.server);
  const bootstrap = await fetch(`${base}/api/bootstrap`, { cache: 'no-store' });
  const bootstrapBody = await responseBody(bootstrap) as { token?: string; error?: string };
  if (!bootstrap.ok || !bootstrapBody.token) throw new Error(bootstrapBody.error || '无法连接 my-wiki 本地服务');
  const save = await fetch(`${base}/api/inbox/browser-article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Write-Token': bootstrapBody.token },
    body: JSON.stringify(message.article),
  });
  const body = await responseBody(save) as { path?: string; duplicate?: boolean; images?: { total: number; failed: number }; error?: string };
  if (!save.ok) throw new Error(body.error || `保存失败（HTTP ${save.status}）`);
  return { ...body, viewerUrl: base };
}

chrome.runtime.onMessage.addListener((message: SaveMessage, _sender, sendResponse) => {
  if (message?.type !== 'MY_WIKI_SAVE_ARTICLE') return;
  void saveArticle(message).then((result) => sendResponse({ ok: true, result })).catch((cause) => sendResponse({ ok: false, error: cause instanceof Error ? cause.message : '保存失败' }));
  return true;
});
