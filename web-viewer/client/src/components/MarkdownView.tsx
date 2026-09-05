import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { FileEntry } from '../types';

function escapeRegex(text: string) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function MarkdownView({ content, file, linkIndex, onWikiLink }: { content: string; file: FileEntry; linkIndex: Map<string, string>; onWikiLink: (target: string) => void }) {
  const html = useMemo(() => {
    const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
    const tokens = new Map<string, { target: string; label: string; exists: boolean }>(); let index = 0;
    const protectedBody = body.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => {
      const key = `WIKILINKTOKEN${index++}X`; tokens.set(key, { target: target.trim(), label: (label || target).trim(), exists: linkIndex.has(target.trim()) }); return key;
    });
    let rendered = marked.parse(protectedBody, { gfm: true, breaks: false }) as string;
    for (const [key, value] of tokens) rendered = rendered.replace(new RegExp(escapeRegex(key), 'g'), `<a href="#" class="wiki-link${value.exists ? '' : ' broken'}" data-wiki-target="${encodeURIComponent(value.target)}">${value.label.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</a>`);
    return DOMPurify.sanitize(rendered, { ADD_ATTR: ['data-wiki-target'] });
  }, [content, linkIndex]);
  const [resolved, setResolved] = useState(html);
  useEffect(() => {
    let active = true; const container = document.createElement('div'); container.innerHTML = html;
    const images = [...container.querySelectorAll('img')];
    Promise.all(images.map(async (image) => {
      const src = image.getAttribute('src') || '';
      if (!src || /^(https?:|data:|blob:|\/api\/)/.test(src)) return;
      const base = file.path.split('/').slice(0, -1).join('/'); const normalized = new URL(src, `https://local/${base}/`).pathname.slice(1);
      image.setAttribute('src', `/api/blob?path=${encodeURIComponent(normalized)}`);
    })).then(() => { if (active) setResolved(container.innerHTML); });
    return () => { active = false; };
  }, [html, file.path]);
  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: resolved }} onClick={(event) => {
    const target = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-wiki-target]');
    if (!target) return; event.preventDefault(); onWikiLink(decodeURIComponent(target.dataset.wikiTarget || ''));
  }}/>;
}

export function ZoneBadge({ zone }: { zone: FileEntry['zone'] }) {
  return <span className={`zone-badge zone-${zone}`}>{zone === 'raw' ? '原始 · 只读' : zone === 'wiki' ? '派生 · 可编辑' : '暂存 · 可编辑'}</span>;
}
export function StatusBadge({ status }: { status?: string }) {
  if (!status) return null; return <span className={`status-badge status-${status}`}>{status === 'archived' ? '已归档' : status === 'review' ? '需确认' : '待整理'}</span>;
}
