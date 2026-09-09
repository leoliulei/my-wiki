import { extractWeChatArticle } from './extract.js';

declare global {
  var __MY_WIKI_WECHAT_CAPTURE_INSTALLED__: boolean | undefined;
}

if (!globalThis.__MY_WIKI_WECHAT_CAPTURE_INSTALLED__) {
  globalThis.__MY_WIKI_WECHAT_CAPTURE_INSTALLED__ = true;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'MY_WIKI_EXTRACT_ARTICLE') return;
    try { sendResponse({ ok: true, article: extractWeChatArticle() }); }
    catch (cause) { sendResponse({ ok: false, error: cause instanceof Error ? cause.message : '文章提取失败' }); }
  });
}
