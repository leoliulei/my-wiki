export {};

const serverInput = document.querySelector<HTMLInputElement>('#server')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save')!;
const statusElement = document.querySelector<HTMLParagraphElement>('#status')!;
const openLink = document.querySelector<HTMLAnchorElement>('#open')!;

function setStatus(message: string, kind?: 'error' | 'success') {
  statusElement.textContent = message;
  statusElement.className = kind || '';
}

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('无法读取当前标签页');
  return tab;
}

async function extract(tabId: number) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: 'MY_WIKI_EXTRACT_ARTICLE' });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    return chrome.tabs.sendMessage(tabId, { type: 'MY_WIKI_EXTRACT_ARTICLE' });
  }
}

async function save() {
  saveButton.disabled = true; openLink.hidden = true; setStatus('正在读取当前文章…');
  try {
    const server = serverInput.value.trim().replace(/\/+$/, '');
    const tab = await activeTab();
    if (!tab.url || !/^https:\/\/mp\.weixin\.qq\.com\/s(?:[/?]|$)/.test(tab.url)) throw new Error('请先打开一篇微信公众号文章');
    const extracted = await extract(tab.id!);
    if (!extracted?.ok) throw new Error(extracted?.error || '文章提取失败');
    setStatus('正在下载文章图片并保存到本地…');
    const saved = await chrome.runtime.sendMessage({ type: 'MY_WIKI_SAVE_ARTICLE', server, article: extracted.article });
    if (!saved?.ok) throw new Error(saved?.error || '保存失败');
    await chrome.storage.local.set({ server });
    const images = saved.result.images as { total: number; failed: number } | undefined;
    const imageText = images?.total ? `，图片 ${images.total - images.failed}/${images.total} 已本地化` : '';
    setStatus(saved.result.duplicate ? `文章已存在${imageText}` : `已保存到 ${saved.result.path}${imageText}`, 'success');
    openLink.href = saved.result.viewerUrl;
    openLink.hidden = false;
  } catch (cause) {
    setStatus(cause instanceof Error ? cause.message : '保存失败', 'error');
  } finally { saveButton.disabled = false; }
}

void chrome.storage.local.get('server').then(({ server }) => { if (typeof server === 'string') serverInput.value = server; });
saveButton.addEventListener('click', () => void save());
