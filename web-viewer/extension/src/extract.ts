export interface ExtractedArticle {
  title: string;
  author?: string;
  publishedAt?: string;
  sourceUrl: string;
  html: string;
}

const REMOVE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'form', 'button', 'input', 'textarea', 'video', 'audio',
  '#js_pc_qr_code', '#js_toobar3', '.rich_media_tool', '.reward_area', '.qr_code_pc', '.weui-desktop-popover',
  '[aria-hidden="true"]',
];

function text(selector: string): string | undefined {
  return document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || undefined;
}

function absoluteUrl(value: string): string {
  try { return new URL(value, location.href).toString(); } catch { return ''; }
}

export function extractWeChatArticle(): ExtractedArticle {
  if (location.hostname !== 'mp.weixin.qq.com' || !(location.pathname === '/s' || location.pathname.startsWith('/s/'))) throw new Error('当前页面不是微信公众号文章');
  const root = document.querySelector<HTMLElement>('#js_content, .rich_media_content');
  if (!root) throw new Error('没有找到文章正文，请确认页面已完成加载且不是验证码页');
  const clone = root.cloneNode(true) as HTMLElement;
  for (const selector of REMOVE_SELECTORS) clone.querySelectorAll(selector).forEach((node) => node.remove());
  clone.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    const source = image.getAttribute('data-src') || image.getAttribute('data-original') || image.getAttribute('src') || '';
    const normalized = absoluteUrl(source);
    if (normalized) image.setAttribute('src', normalized); else image.remove();
    image.removeAttribute('srcset');
    image.removeAttribute('data-src');
    image.removeAttribute('data-original');
    image.loading = 'eager';
  });
  clone.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.removeAttribute('style');
    element.removeAttribute('id');
    for (const attribute of [...element.attributes]) {
      if (attribute.name.startsWith('on') || attribute.name.startsWith('data-') || ['contenteditable', 'tabindex'].includes(attribute.name)) element.removeAttribute(attribute.name);
    }
  });
  clone.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = absoluteUrl(anchor.getAttribute('href') || '');
    if (href) anchor.href = href; else anchor.removeAttribute('href');
  });
  const title = text('#activity-name') || text('.rich_media_title') || document.title.replace(/\s*[-_].*微信.*$/i, '').trim();
  const articleText = clone.textContent?.replace(/\s+/g, '').trim() || '';
  if (!title || articleText.length < 20) throw new Error('文章正文为空或过短，可能仍停留在验证页面');
  return {
    title,
    author: text('#js_name') || text('.rich_media_meta_nickname'),
    publishedAt: text('#publish_time') || text('#meta_content .rich_media_meta_text'),
    sourceUrl: location.href,
    html: clone.innerHTML,
  };
}
