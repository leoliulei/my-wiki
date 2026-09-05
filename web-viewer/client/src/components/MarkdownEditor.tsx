import { useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Braces, Check, Code2, Heading2, Italic, Link, List, ListChecks, LoaderCircle, Minus, Quote, Strikethrough, Table2, Upload } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TurndownService from 'turndown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { FileEntry } from '../types';
import { ApiError, api } from '../api';

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
turndown.addRule('strike', { filter: ['del', 's'], replacement: (content) => `~~${content}~~` });

interface Conflict { diskContent: string; diskVersion: string; }

export function MarkdownEditor({ file, content, onSaved, onExit, notify }: { file: FileEntry; content: string; onSaved: (path: string) => void; onExit: () => void; notify: (message: string) => void }) {
  const initialBody = useMemo(() => content.replace(/^---\n[\s\S]*?\n---\n?/, ''), [content]); const frontmatter = content.match(/^---\n[\s\S]*?\n---\n?/)?.[0] || '';
  const [mode, setMode] = useState<'visual'|'source'>('visual'); const [source, setSource] = useState(content);
  const [status, setStatus] = useState<'saved'|'dirty'|'saving'|'error'|'conflict'>('saved'); const [version, setVersion] = useState(file.version);
  const [conflict, setConflict] = useState<Conflict | null>(null); const timer = useRef<number | undefined>(undefined); const draftKey = `my-wiki:draft:${file.path}`;
  const editor = useEditor({
    extensions: [StarterKit, Image, LinkExtension.configure({ openOnClick: false }), Placeholder.configure({ placeholder: '输入 / 可查看常用 Markdown 块…' })],
    content: DOMPurify.sanitize(marked.parse(initialBody) as string),
    editorProps: { attributes: { class: 'tiptap-page markdown-body' } },
    onUpdate: () => setStatus('dirty'),
  });
  const currentText = () => mode === 'source' ? source : `${frontmatter}${turndown.turndown(editor?.getHTML() || '')}\n`;
  const persistDraft = (value: string) => localStorage.setItem(draftKey, value);
  const save = async (force = false) => {
    const value = currentText(); persistDraft(value); setStatus('saving');
    try { const result = await api.saveFile(file.path, value, version, force); setVersion(result.file.version); setSource(value); setStatus('saved'); localStorage.removeItem(draftKey); onSaved(file.path); }
    catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.body.conflict) { setConflict(error.body.conflict); setStatus('conflict'); }
      else { setStatus('error'); notify(error instanceof Error ? error.message : '保存失败'); }
    }
  };
  useEffect(() => {
    const draft = localStorage.getItem(draftKey);
    if (draft && draft !== content && window.confirm('发现此文件有未保存草稿，是否恢复？')) {
      setSource(draft); setMode('source'); setStatus('dirty');
    }
    return () => window.clearTimeout(timer.current);
  }, [draftKey, content]);
  useEffect(() => {
    if (status !== 'dirty') return; persistDraft(currentText()); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => void save(), 800);
    return () => window.clearTimeout(timer.current);
  }, [status, source, editor?.getJSON()]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save(); } };
    const leave = (event: BeforeUnloadEvent) => { if (status === 'dirty' || status === 'saving' || status === 'error') event.preventDefault(); };
    window.addEventListener('keydown', key); window.addEventListener('beforeunload', leave); return () => { window.removeEventListener('keydown', key); window.removeEventListener('beforeunload', leave); };
  });
  const visualToSource = () => { setSource(currentText()); setMode('source'); };
  const sourceToVisual = () => { const parsedBody = source.replace(/^---\n[\s\S]*?\n---\n?/, ''); editor?.commands.setContent(DOMPurify.sanitize(marked.parse(parsedBody) as string)); setMode('visual'); };
  const insert = (before: string, after = '') => {
    if (mode === 'source') { setSource((value) => `${value}${value.endsWith('\n') ? '' : '\n'}${before}${after}`); setStatus('dirty'); }
    else editor?.chain().focus().insertContent(before).run();
  };
  const handleImage = async (fileValue?: File) => {
    if (!fileValue) return;
    try { const result = await api.uploadImage(file.path, fileValue); const markdown = `![${fileValue.name}](${result.relativePath})`; if (mode === 'source') { setSource((v) => `${v}\n${markdown}\n`); setStatus('dirty'); } else editor?.chain().focus().setImage({ src: `/api/blob?path=${encodeURIComponent(result.relativePath)}` }).run(); notify('图片已写入附件目录'); }
    catch (error) { notify(error instanceof Error ? error.message : '图片写入失败'); }
  };
  const statusLabel = { saved: '已保存', dirty: '未保存更改', saving: '保存中…', error: '保存失败', conflict: '外部已修改' }[status];
  return <div className="editor-shell">
    <div className="editor-toolbar">
      <div className="mode-switch"><button className={mode === 'visual' ? 'active' : ''} onClick={sourceToVisual}>即时渲染</button><button className={mode === 'source' ? 'active' : ''} onClick={visualToSource}>源码模式</button></div>
      <button title="标题" onClick={() => mode === 'visual' ? editor?.chain().focus().toggleHeading({ level: 2 }).run() : insert('\n## 标题')}><Heading2 size={15}/></button>
      <button title="粗体" onClick={() => mode === 'visual' ? editor?.chain().focus().toggleBold().run() : insert('**文本**')}><Bold size={15}/></button>
      <button title="斜体" onClick={() => mode === 'visual' ? editor?.chain().focus().toggleItalic().run() : insert('*文本*')}><Italic size={15}/></button>
      <button title="删除线" onClick={() => mode === 'visual' ? editor?.chain().focus().toggleStrike().run() : insert('~~文本~~')}><Strikethrough size={15}/></button>
      <button title="行内代码" onClick={() => mode === 'visual' ? editor?.chain().focus().toggleCode().run() : insert('`代码`')}><Code2 size={15}/></button>
      <button title="链接" onClick={() => { const url = window.prompt('链接地址'); if (url) mode === 'visual' ? editor?.chain().focus().setLink({ href: url }).run() : insert('[文本](', `${url})`); }}><Link size={15}/></button>
      <button title="无序列表" onClick={() => mode === 'visual' ? editor?.chain().focus().toggleBulletList().run() : insert('\n- 列表项')}><List size={15}/></button>
      <button title="任务列表" onClick={() => insert('\n- [ ] 待办事项')}><ListChecks size={15}/></button>
      <button title="引用" onClick={() => mode === 'visual' ? editor?.chain().focus().toggleBlockquote().run() : insert('\n> 引用')}><Quote size={15}/></button>
      <button title="代码块" onClick={() => mode === 'visual' ? editor?.chain().focus().toggleCodeBlock().run() : insert('\n```ts\n\n```')}><Braces size={15}/></button>
      <button title="表格" onClick={() => insert('\n| 列 1 | 列 2 |\n| --- | --- |\n|  |  |')}><Table2 size={15}/></button>
      <button title="分隔线" onClick={() => mode === 'visual' ? editor?.chain().focus().setHorizontalRule().run() : insert('\n---')}><Minus size={15}/></button>
      <label className="toolbar-upload" title="插入图片"><Upload size={15}/><input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(event) => void handleImage(event.target.files?.[0])}/></label>
      <span className={`save-state ${status}`}>{status === 'saving' ? <LoaderCircle size={13} className="spin"/> : status === 'saved' ? <Check size={13}/> : null}{statusLabel}</span>
      <button className="primary" onClick={async () => { await save(); if (status !== 'conflict') onExit(); }}>完成编辑</button>
    </div>
    <div className="editor-scroll" onDrop={(event) => { const f = event.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) { event.preventDefault(); void handleImage(f); } }} onDragOver={(event) => event.preventDefault()}>
      <div className="editor-page">
        {mode === 'visual' ? <EditorContent editor={editor}/> : <textarea className="source-editor" value={source} onChange={(event) => { setSource(event.target.value); setStatus('dirty'); }} spellCheck={false}/>}
        <p className="editor-help">Markdown 原文是唯一真源 · Cmd/Ctrl+S 保存 · 图片可粘贴选择或拖入 · 源码模式保留 frontmatter 与 wiki-link</p>
      </div>
    </div>
    {conflict && <div className="modal-mask"><div className="modal conflict-modal"><header><h2>外部已修改</h2></header><div className="modal-body"><p>磁盘文件在你编辑期间发生变化，默认不覆盖。本地草稿已保留。</p><pre className="diff-preview">{conflict.diskContent.slice(0, 1000)}</pre></div><footer><button onClick={() => setConflict(null)}>取消</button><button onClick={async () => { const copy = await api.saveCopy(file.title, currentText()); localStorage.removeItem(draftKey); notify(`已另存副本：${copy.file.path}`); setConflict(null); }}>另存副本</button><button onClick={() => { setSource(conflict.diskContent); setVersion(conflict.diskVersion); setMode('source'); setConflict(null); setStatus('saved'); }}>加载磁盘版本</button><button className="primary" onClick={() => { setConflict(null); void save(true); }}>保留我的版本</button></footer></div></div>}
  </div>;
}
