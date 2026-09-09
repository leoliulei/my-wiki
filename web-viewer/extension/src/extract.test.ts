// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

function setDocument(html: string, url = 'https://mp.weixin.qq.com/s/example') {
  const dom = new DOMParser().parseFromString(html, 'text/html');
  vi.stubGlobal('document', dom);
  vi.stubGlobal('location', new URL(url));
}

describe('微信文章页面提取', () => {
  it('提取标题、作者、正文并还原懒加载图片', async () => {
    setDocument(`<!doctype html><html><head><title>测试文章</title></head><body>
      <h1 id="activity-name">微信文章标题</h1><span id="js_name">公众号作者</span><span id="publish_time">2026-09-10</span>
      <div id="js_content"><p onclick="bad()">正文内容足够长，能够被识别为一篇完整文章。</p><img data-src="https://mmbiz.qpic.cn/test.jpg"><script>bad()</script></div>
    </body></html>`);
    const { extractWeChatArticle } = await import('../src/extract.js');
    const result = extractWeChatArticle();
    expect(result.title).toBe('微信文章标题');
    expect(result.author).toBe('公众号作者');
    expect(result.html).toContain('src="https://mmbiz.qpic.cn/test.jpg"');
    expect(result.html).not.toMatch(/script|onclick/i);
  });

  it('拒绝验证码页或非文章页', async () => {
    setDocument('<html><body><div>请完成验证</div></body></html>', 'https://mp.weixin.qq.com/mp/wappoc_appmsgcaptcha');
    const { extractWeChatArticle } = await import('../src/extract.js');
    expect(() => extractWeChatArticle()).toThrow('当前页面不是微信公众号文章');
  });
});
