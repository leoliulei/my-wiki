import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseURL = process.env.PAGES_PREVIEW_URL || 'http://127.0.0.1:4173/my-wiki/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors: string[] = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(baseURL);
await page.getByRole('heading', { name: '文件系统即知识库' }).waitFor();
assert.equal(await page.getByText('公开只读', { exact: true }).first().isVisible(), true);
assert.equal(await page.getByRole('button', { name: '收藏' }).count(), 0);

const search = page.getByPlaceholder(/搜索文件名与正文/);
await search.fill('china-macro-topic-map.svg');
await page.getByText(/找到 \d+ 条与「china-macro-topic-map\.svg」/).waitFor();
await page.locator('.search-popover button').filter({ has: page.locator('code', { hasText: 'wiki/overviews/china-macro.md' }) }).click();
const svgImage = page.locator('.markdown-body img[alt="中国宏观主题地图"]');
await svgImage.waitFor();
await svgImage.evaluate(async (image) => {
  const element = image as HTMLImageElement;
  if (element.complete) return;
  await new Promise<void>((resolve, reject) => {
    element.addEventListener('load', () => resolve(), { once: true });
    element.addEventListener('error', () => reject(new Error(`SVG 加载失败：${element.src}`)), { once: true });
  });
});
assert.ok((await svgImage.getAttribute('src'))?.includes('/my-wiki/content/wiki/assets/china-macro-topic-map.svg'));
assert.ok(await svgImage.evaluate((image) => (image as HTMLImageElement).naturalWidth > 0));

await page.goto(baseURL);
await page.getByRole('heading', { name: '文件系统即知识库' }).waitFor();
const articleSearch = page.getByPlaceholder(/搜索文件名与正文/);
await articleSearch.fill('Mooncake');
await page.getByText(/找到 \d+ 条与「Mooncake」/).waitFor();
await page.getByRole('button', { name: /Mooncake 论文摘要/ }).first().click();
await page.locator('a.wiki-link').first().click();
await page.locator('.preview-body .markdown-body').waitFor();
assert.deepEqual(errors, []);
console.log('Pages static smoke passed.');
await browser.close();
