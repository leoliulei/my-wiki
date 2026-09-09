import { describe, expect, it } from 'vitest';
import { articleDocument, browserArticleFingerprint, cleanBrowserArticleHtml, validateBrowserArticleInput } from '../src/browser-article.js';

describe('浏览器文章导入', () => {
  it('只接受微信公众号文章地址', () => {
    expect(validateBrowserArticleInput({ title: '文章', sourceUrl: 'https://mp.weixin.qq.com/s/example', html: '<p>这是一段足够长的文章正文内容，用于通过校验。</p>' }).title).toBe('文章');
    expect(() => validateBrowserArticleInput({ title: '文章', sourceUrl: 'https://example.com/s/example', html: '<p>正文</p>' })).toThrow('只接受微信公众号文章页');
    expect(() => validateBrowserArticleInput({ title: '文章', sourceUrl: 'https://mp.weixin.qq.com/spam', html: '<p>正文</p>' })).toThrow('只接受微信公众号文章页');
  });

  it('移除脚本、事件和危险协议，同时保留文章结构与图片', () => {
    const clean = cleanBrowserArticleHtml('<section><h2>标题</h2><script>alert(1)</script><p onclick="evil()">正文 <a href="javascript:evil()">链接</a></p><img src="https://mmbiz.qpic.cn/a.jpg" onerror="evil()"></section>');
    expect(clean).toContain('<h2>标题</h2>');
    expect(clean).toContain('https://mmbiz.qpic.cn/a.jpg');
    expect(clean).not.toMatch(/script|onclick|onerror|javascript:/i);
  });

  it('重复指纹不受本地文档包装影响', () => {
    const input = validateBrowserArticleInput({ title: '同一文章', sourceUrl: 'https://mp.weixin.qq.com/s/example', html: '<p>这是一段足够长且内容固定的文章正文，用于验证重复检测。</p>' });
    const clean = cleanBrowserArticleHtml(input.html);
    expect(browserArticleFingerprint(input, clean)).toBe(browserArticleFingerprint(input, clean));
    expect(browserArticleFingerprint(input, clean)).not.toBe(browserArticleFingerprint({ ...input, html: '<p>另一篇正文内容。</p>' }, '<p>另一篇正文内容。</p>'));
  });

  it('生成可离线阅读的完整 HTML 文档', () => {
    const document = articleDocument({ title: '离线文章', sourceUrl: 'https://mp.weixin.qq.com/s/example', html: '<p>正文</p>', author: '作者' }, '<p><img src="data:image/png;base64,AA==">正文</p>', { total: 1, failed: 0 });
    expect(document).toContain('<!doctype html>');
    expect(document).toContain('data:image/png;base64,AA==');
    expect(document).toContain('离线文章');
    expect(document).toContain('作者');
  });
});
