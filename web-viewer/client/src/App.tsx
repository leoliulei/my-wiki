import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowLeft, BookOpen, Check, Clipboard, Download, ExternalLink, File, FileImage, FileText, Inbox, LockKeyhole, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { api, ApiError, bootstrap } from './api';
import type { DashboardData, FileEntry, FilePayload, SearchResult, TreeNode } from './types';
import { Sidebar } from './components/Sidebar';
import { MarkdownView, StatusBadge, ZoneBadge } from './components/MarkdownView';
import { MarkdownEditor } from './components/MarkdownEditor';

interface TabInfo { key: string; label: string; count: number; description: string; }
type Route = { kind: 'home' } | { kind: 'tab'; key: string } | { kind: 'file'; path: string };

export function App() {
  const [tree, setTree] = useState<TreeNode[]>([]); const [files, setFiles] = useState<FileEntry[]>([]); const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null); const [route, setRoute] = useState<Route>({ kind: 'home' });
  const [payload, setPayload] = useState<FilePayload | null>(null); const [editing, setEditing] = useState(false); const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); const [results, setResults] = useState<SearchResult[]>([]); const [searchOpen, setSearchOpen] = useState(false);
  const [previewStack, setPreviewStack] = useState<string[]>([]); const [preview, setPreview] = useState<FilePayload | null>(null);
  const [previewWidth, setPreviewWidth] = useState(Number(localStorage.getItem('my-wiki:preview-width') || 390)); const [collectOpen, setCollectOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false); const [toast, setToast] = useState(''); const [confirmDelete, setConfirmDelete] = useState<FileEntry | null>(null);
  const searchTimer = useRef<number | undefined>(undefined); const searchInput = useRef<HTMLInputElement>(null);

  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3000); }, []);
  const refresh = useCallback(async () => {
    const [treeResult, tabsResult, dash] = await Promise.all([api.tree(), api.tabs(), api.dashboard()]);
    setTree(treeResult.tree); setFiles(treeResult.files); setTabs(tabsResult.tabs); setDashboard(dash);
  }, []);
  useEffect(() => { bootstrap().then(refresh).catch((e) => notify(e.message)).finally(() => setLoading(false)); }, [refresh, notify]);
  const openFile = useCallback(async (path: string) => {
    setEditing(false); setRoute({ kind: 'file', path }); setLoading(true);
    try { setPayload(await api.file(path)); } catch (error) { notify(error instanceof Error ? error.message : '文件加载失败'); setPayload(null); }
    finally { setLoading(false); }
  }, [notify]);
  useEffect(() => {
    window.clearTimeout(searchTimer.current); if (!search.trim()) { setResults([]); return; }
    searchTimer.current = window.setTimeout(() => api.search(search).then((r) => setResults(r.results)).catch(() => setResults([])), 180);
  }, [search]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !editing) { event.preventDefault(); searchInput.current?.focus(); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [editing]);
  const linkIndex = useMemo(() => {
    const map = new Map<string, string>(); files.filter((f) => f.zone === 'wiki' && f.kind === 'md').forEach((f) => {
      map.set(f.title, f.path); const shortTitle = f.title.split(/[（(]/)[0].trim(); if (shortTitle && shortTitle !== f.title) map.set(shortTitle, f.path); const aliases = f.frontmatter?.aliases; if (Array.isArray(aliases)) aliases.forEach((alias) => map.set(String(alias), f.path));
      map.set(f.name.replace(/\.md$/, ''), f.path);
    }); return map;
  }, [files]);
  const openWikiLink = useCallback(async (target: string) => {
    const path = linkIndex.get(target); setPreviewStack((stack) => [...stack, path || `!${target}`]);
    if (!path) { setPreview(null); return; }
    try { setPreview(await api.file(path)); } catch { setPreview(null); }
  }, [linkIndex]);
  const closePreview = () => { setPreviewStack([]); setPreview(null); };
  const backPreview = async () => {
    const next = previewStack.slice(0, -1); setPreviewStack(next); const path = next.at(-1);
    if (path && !path.startsWith('!')) setPreview(await api.file(path)); else setPreview(null);
  };
  const current = payload?.file;
  const action = async (kind: 'edit'|'rename'|'delete', path: string) => {
    const file = files.find((item) => item.path === path); if (!file) return;
    if (kind === 'edit') { await openFile(path); setEditing(true); }
    if (kind === 'rename') { const title = window.prompt('输入新标题（不含扩展名）', file.title); if (!title) return; try { const result = await api.renameFile(path, title); await refresh(); await openFile(result.path); notify('已重命名并同步更新全库 wiki-link'); } catch (e) { notify(e instanceof Error ? e.message : '重命名失败'); } }
    if (kind === 'delete') setConfirmDelete(file);
  };
  const deleteFile = async () => { if (!confirmDelete) return; try { await api.deleteFile(confirmDelete.path); setConfirmDelete(null); setRoute({ kind: 'home' }); setPayload(null); await refresh(); notify('文件已删除'); } catch (e) { notify(e instanceof Error ? e.message : '删除失败'); } };

  if (loading && !dashboard) return <div className="boot-screen"><BookOpen size={28}/><span>正在读取知识库…</span></div>;
  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => { setRoute({ kind: 'home' }); setEditing(false); }}><span className="brand-mark"><BookOpen size={14}/></span><span><b>my-wiki</b><small>WEB 知识库</small></span></button>
      <nav className="tabs">{tabs.map((tab) => <button key={tab.key} className={route.kind === 'tab' && route.key === tab.key ? 'active' : ''} onClick={() => { setRoute({ kind: 'tab', key: tab.key }); setEditing(false); }}>{tab.label}<small>{tab.count}</small></button>)}</nav>
      <div className="top-actions">
        <div className="search-box"><Search size={14}/><input ref={searchInput} placeholder="搜索文件名与正文（含暂存区）" value={search} onChange={(e) => setSearch(e.target.value)} onFocus={() => setSearchOpen(true)} onBlur={() => window.setTimeout(() => setSearchOpen(false), 180)}/><kbd>⌘K</kbd>
          {searchOpen && search.trim() && <SearchPopover query={search} results={results} onOpen={(path) => { setSearchOpen(false); setSearch(''); void openFile(path); }}/>} </div>
        <button className="primary" onClick={() => setCollectOpen(true)}><Plus size={14}/>收藏</button>
      </div>
    </header>
    <div className="workspace">
      <Sidebar tree={tree} current={route.kind === 'file' ? route.path : undefined} onOpen={(path) => void openFile(path)} onAction={(kind, path) => void action(kind, path)} onCreate={() => setCreateOpen(true)}/>
      <main className="main-pane">{loading ? <div className="loading">正在加载…</div> : editing && current && payload?.content !== undefined ? <MarkdownEditor file={current} content={payload.content} onSaved={async (path: string) => { await refresh(); setPayload(await api.file(path)); }} onExit={() => setEditing(false)} notify={notify}/> : <MainView route={route} dashboard={dashboard} tabs={tabs} files={files} payload={payload} linkIndex={linkIndex} onOpen={(path: string) => void openFile(path)} onOpenTab={(key: string) => setRoute({ kind: 'tab', key })} onEdit={() => setEditing(true)} onWikiLink={(target: string) => void openWikiLink(target)} onCollect={() => setCollectOpen(true)} onRefresh={refresh} notify={notify}/>}</main>
      {previewStack.length ? <><div className="resize-handle" onMouseDown={(event) => { const start = event.clientX, width = previewWidth; const move = (e: MouseEvent) => { const next = Math.max(300, Math.min(680, width + start - e.clientX)); setPreviewWidth(next); localStorage.setItem('my-wiki:preview-width', String(next)); }; const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); }; window.addEventListener('mousemove', move); window.addEventListener('mouseup', up); }}/><aside className="preview-pane" style={{ width: previewWidth }}><Preview payload={preview} broken={previewStack.at(-1)?.startsWith('!') ? previewStack.at(-1)!.slice(1) : undefined} linkIndex={linkIndex} onWikiLink={(t: string) => void openWikiLink(t)} onBack={() => void backPreview()} onClose={closePreview} onOpenMain={() => { const path = previewStack.at(-1); if (path && !path.startsWith('!')) void openFile(path); closePreview(); }}/></aside></> : <aside className="meta-pane"><MetaPanel file={current}/></aside>}
    </div>
    {collectOpen && <CollectModal onClose={() => setCollectOpen(false)} onDone={async (message, path) => { setCollectOpen(false); await refresh(); if (path) await openFile(path); notify(message); }}/>}
    {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onDone={async (path) => { setCreateOpen(false); await refresh(); await openFile(path); setEditing(true); notify('wiki 页面已创建'); }}/>}
    {confirmDelete && <div className="modal-mask"><div className="modal small"><header><h2>删除文件</h2><button onClick={() => setConfirmDelete(null)}><X size={15}/></button></header><div className="modal-body"><p>将删除 <code>{confirmDelete.path}</code>。{confirmDelete.zone === 'wiki' ? '引用该页的链接可能变成断链，并会写入操作日志。' : '删除仅作用于 inbox/。'}</p></div><footer><button onClick={() => setConfirmDelete(null)}>取消</button><button className="danger" onClick={() => void deleteFile()}>确认删除</button></footer></div></div>}
    {toast && <div className="toast"><Check size={14}/>{toast}</div>}
  </div>;
}

function MainView({ route, dashboard, tabs, files, payload, linkIndex, onOpen, onOpenTab, onEdit, onWikiLink, onCollect, onRefresh, notify }: any) {
  if (route.kind === 'home') return <Home dashboard={dashboard} onOpen={onOpen} onOpenTab={onOpenTab}/>;
  if (route.kind === 'tab') return route.key === 'inbox' ? <InboxView files={files} onOpen={onOpen} onCollect={onCollect} onRefresh={onRefresh} notify={notify}/> : <TabList tab={tabs.find((t: TabInfo) => t.key === route.key)} files={files.filter((f: FileEntry) => tabMatches(f, route.key))} onOpen={onOpen}/>;
  if (!payload) return <Empty title="文件不存在" text="文件可能已被移动或删除。"/>;
  const { file, content, url } = payload;
  if (file.kind === 'md' && content !== undefined) return <article className="doc-page"><DocHeader file={file} onEdit={onEdit}/><MarkdownView content={content} file={file} linkIndex={linkIndex} onWikiLink={onWikiLink}/></article>;
  if (file.kind === 'html' && content !== undefined) return <article className="doc-page wide"><DocHeader file={file}/><div className="reader-note"><LockKeyhole size={14}/>安全沙箱渲染：脚本、表单、弹窗与顶层导航均已禁用。</div><iframe className="html-reader" title={file.title} srcDoc={content} sandbox=""/></article>;
  if (file.kind === 'pdf') return <article className="doc-page wide"><DocHeader file={file}/><embed className="pdf-reader" src={url} type="application/pdf"/><a className="download-link" href={url} download><Download size={14}/>若浏览器无法预览，请下载原件</a></article>;
  if (file.kind === 'image') return <article className="doc-page"><DocHeader file={file}/><div className="image-reader"><img src={url} alt={file.title}/></div></article>;
  return <article className="doc-page"><DocHeader file={file}/><pre className="plain-reader">{content}</pre></article>;
}
function tabMatches(file: FileEntry, key: string) { if (key === 'raw') return file.zone === 'raw'; if (key === 'archived') return file.zone === 'inbox' && file.status === 'archived'; if (key === 'synthesis') return ['overview', 'synthesis'].includes(file.category); return file.category === key; }
function Home({ dashboard, onOpen, onOpenTab }: { dashboard: DashboardData | null; onOpen: (path: string) => void; onOpenTab: (key: string) => void }) {
  if (!dashboard) return null; return <div className="home-page"><section className="home-hero"><div className="kicker">MY-WIKI · WEB 知识库</div><h1>文件系统即知识库</h1><p>raw 不可变原始资料 · wiki 可再生理解层 · inbox 暂存待整理。浏览器直接读取本地 Markdown、HTML、PDF 与图片。</p><div className="stats"><div><b>{dashboard.counts.wiki}</b><span>wiki 笔记</span></div><div><b>{dashboard.counts.raw}</b><span>原始资料</span></div><div><b className="accent">{dashboard.counts.inbox}</b><span>待整理</span></div><div><b>{dashboard.counts.tags}</b><span>标签</span></div></div>{dashboard.counts.inbox > 0 && <div className="pending-callout"><Inbox size={18}/><p><strong>待整理 {dashboard.counts.inbox} 篇</strong>　收藏尚未经 Agent 整理，可复制「收录 inbox/…」到 LLM CLI。</p><button className="primary" onClick={() => onOpenTab('inbox')}>去整理</button></div>}</section><div className="home-columns"><section><h2>最近更新 <small>按 frontmatter updated</small></h2>{dashboard.recent.map((file) => <button className="recent-row" key={file.path} onClick={() => onOpen(file.path)}><strong>{file.title}</strong><span>{typeLabel(file.category)}</span><time>{String(file.frontmatter?.updated || '')}</time></button>)}</section><section><h2>标签云</h2><div className="tag-cloud">{dashboard.tags.map((tag) => <span key={tag.name}>{tag.name}<small>{tag.count}</small></span>)}</div></section></div></div>;
}
function TabList({ tab, files, onOpen }: { tab?: TabInfo; files: FileEntry[]; onOpen: (path: string) => void }) { return <div className="list-page"><header><small>分类</small><h1>{tab?.label}</h1><p>{tab?.description}　共 {files.length} 条</p></header>{files.length ? files.map((file) => <button className="list-row" key={file.path} onClick={() => onOpen(file.path)}><FileText size={15}/><div><strong>{file.title}</strong><p><ZoneBadge zone={file.zone}/>{Array.isArray(file.frontmatter?.tags) && file.frontmatter.tags.slice(0, 3).map((tag) => <span className="tag" key={String(tag)}>{String(tag)}</span>)}</p></div><time>{String(file.frontmatter?.updated || file.savedAt || '')}</time></button>) : <Empty title="暂无文档" text={tab?.key === 'entity' || tab?.key === 'concept' ? '需 2 篇以上资料提及后建立。' : '该分类下还没有内容。'}/>}</div>; }
function DocHeader({ file, onEdit }: { file: FileEntry; onEdit?: () => void }) { return <header className="doc-header"><div><ZoneBadge zone={file.zone}/><StatusBadge status={file.status}/></div><h1>{file.title}</h1><p><code>{file.path}</code>{file.frontmatter?.updated && <span>更新于 {String(file.frontmatter.updated)}</span>}</p>{file.editable && onEdit ? <button className="primary" onClick={onEdit}>编辑</button> : file.zone === 'raw' ? <span className="readonly"><LockKeyhole size={12}/>原始资料 · 只读</span> : null}</header>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><BookOpen size={36}/><h2>{title}</h2><p>{text}</p></div>; }
function typeLabel(type: string) { return ({ summary: '摘要', entity: '实体', concept: '概念', comparison: '对比', overview: '综述', synthesis: '综述' } as Record<string,string>)[type] || '文档'; }

function MetaPanel({ file }: { file?: FileEntry }) { if (!file) return <div className="meta-panel"><h3>元信息</h3><p>打开任意文件后，这里展示路径、类型、标签、状态与分区权限。点击正文中的 wiki-link 会切换为侧栏预览，主区阅读位置不受影响。</p></div>; const fm = file.frontmatter || {}; return <div className="meta-panel"><h3>元信息</h3><Meta k="路径"><code>{file.path}</code></Meta><Meta k="分区"><ZoneBadge zone={file.zone}/></Meta><Meta k="类型">{typeLabel(file.category)}</Meta>{file.status && <Meta k="状态"><StatusBadge status={file.status}/></Meta>}<Meta k="大小">{formatBytes(file.size)}</Meta>{fm.created && <Meta k="创建">{String(fm.created)}</Meta>}{fm.updated && <Meta k="更新">{String(fm.updated)}</Meta>}{Array.isArray(fm.tags) && <Meta k="标签"><span className="tag-wrap">{fm.tags.map((t) => <span className="tag" key={String(t)}>{String(t)}</span>)}</span></Meta>}<div className="meta-note">{file.zone === 'raw' ? 'raw 区不可变：无编辑、删除或重命名入口，后端写接口同样拒绝。' : file.zone === 'inbox' ? 'inbox 是草稿区：可编辑、改名、归档与清理。' : 'wiki 是可再生理解层；写操作会追加 _log.md 留痕。'}</div></div>; }
function Meta({ k, children }: { k: string; children: any }) { return <div className="meta-row"><span>{k}</span><div>{children}</div></div>; }
function Preview({ payload, broken, linkIndex, onWikiLink, onBack, onClose, onOpenMain }: any) { return <><header className="preview-head"><span>侧栏预览</span><button disabled={!payload} onClick={onBack}><ArrowLeft size={14}/></button><i/><button onClick={onOpenMain} title="在主区打开"><ExternalLink size={14}/></button><button onClick={onClose}><X size={14}/></button></header><div className="preview-body">{broken ? <Empty title="页面不存在" text={`[[${broken}]] 暂无对应页面。`}/> : payload?.content !== undefined ? <><h2>{payload.file.title}</h2><MarkdownView content={payload.content} file={payload.file} linkIndex={linkIndex} onWikiLink={onWikiLink}/></> : <Empty title="无法预览" text="请在主区打开此文件。"/>}</div></>; }
function SearchPopover({ query, results, onOpen }: { query: string; results: SearchResult[]; onOpen: (path: string) => void }) { return <div className="search-popover"><header>找到 {results.length} 条与「{query}」相关的结果</header>{results.length ? results.slice(0, 12).map((item) => <button key={item.path} onMouseDown={(e) => e.preventDefault()} onClick={() => onOpen(item.path)}><FileText size={14}/><div><strong>{item.title}</strong><code>{item.path}</code>{item.snippet && <p>…{item.snippet}…</p>}</div><ZoneBadge zone={item.zone}/></button>) : <p className="no-result">没有匹配的文件或正文内容</p>}</div>; }

function InboxView({ files, onOpen, onCollect, onRefresh, notify }: any) {
  const [filter, setFilter] = useState('all'); const items = files.filter((f: FileEntry) => f.zone === 'inbox' && f.path !== 'inbox/_inbox.md').sort((a: FileEntry,b: FileEntry) => String(b.savedAt || '').localeCompare(String(a.savedAt || ''))); const shown = items.filter((f: FileEntry) => filter === 'all' || f.status === filter);
  const copy = async (path: string) => { const text = `收录 ${path}`; try { await navigator.clipboard.writeText(text); notify(`已复制：${text}`); } catch { window.prompt('请手动复制整理指令', text); } };
  return <div className="list-page inbox-page"><header><small>暂存区 · inbox/</small><h1>暂存清单</h1><p>收藏但未经 Agent 整理的文档。整理在 LLM CLI 中触发，完成后回来标记归档。</p><div className="inbox-toolbar"><div className="segments">{[['all','全部'],['inbox','待整理'],['review','需确认'],['archived','已归档']].map(([key,label]) => <button className={filter === key ? 'active' : ''} onClick={() => setFilter(key)} key={key}>{label}</button>)}</div><button className="primary" onClick={onCollect}><Plus size={14}/>收藏到暂存区</button>{items.some((f: FileEntry) => f.status === 'archived') && <button onClick={async () => { const r = await api.deleteArchived(); await onRefresh(); notify(`已清理 ${r.deleted} 个归档项`); }}><Trash2 size={14}/>批量删除已归档</button>}</div></header>{shown.length ? shown.map((file: FileEntry) => <div className="inbox-card" key={file.path}>{file.kind === 'image' ? <FileImage size={17}/> : <FileText size={17}/>}<div><button className="item-title" onClick={() => onOpen(file.path)}>{file.title}<StatusBadge status={file.status}/></button><p>{file.kind.toUpperCase()}　收藏于 {file.savedAt?.slice(0,10) || '—'} {file.sourceUrl && <span title={file.sourceUrl}>来源：{file.sourceUrl}</span>}</p></div><button onClick={() => void copy(file.path)}><Clipboard size={13}/>复制整理指令</button><button title={file.status === 'archived' ? '重新标记为待整理' : '标记为已归档'} onClick={async () => { await api.setInboxStatus(file.path, file.status === 'archived' ? 'inbox' : 'archived'); await onRefresh(); }}><Archive size={14}/></button></div>) : <Empty title="暂存区是空的" text="可以上传文件、粘贴文本，或输入公开网址收藏原始文件。"/>}</div>;
}

function CollectModal({ onClose, onDone }: { onClose: () => void; onDone: (message: string, path?: string) => void }) {
  const [way, setWay] = useState<'text'|'file'|'url'>('text'); const [title, setTitle] = useState(''); const [text, setText] = useState(''); const [url, setUrl] = useState(''); const [file, setFile] = useState<File>(); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(''); const job = useRef('');
  const submit = async () => { setBusy(true); try {
    if (way === 'text') { const result = await api.collectText({ title, text }); onDone('已存入暂存区，等待整理', result.file.path); }
    else if (way === 'file') { if (!file) throw new Error('请选择文件'); const result = await api.uploadInbox(file); onDone('文件已存入 inbox/files/', result.file.path); }
    else { if (!/^https?:\/\//.test(url)) throw new Error('请输入 HTTP/HTTPS 网址'); const started = await api.startUrlFetch(url); job.current = started.id; while (true) { await new Promise((r) => setTimeout(r, 300)); const state = await api.urlFetchStatus(started.id); setProgress(state.state === 'connecting' ? '正在连接…' : state.total ? `正在下载 ${Math.round(state.downloaded / state.total * 100)}% · ${formatBytes(state.downloaded)}` : `正在下载 · ${formatBytes(state.downloaded)}`); if (state.state === 'done' && state.result) { onDone(state.result.duplicate ? '内容已存在，已打开原暂存项' : state.result.status === 'review' ? '抓取完成，但内容疑似登录/验证页，已标记“需确认”' : '原始文件已保存到暂存区', state.result.path); break; } if (state.state === 'error' || state.state === 'cancelled') throw new Error(state.error || '抓取已取消'); } }
  } catch (e) { setProgress(e instanceof Error ? e.message : '操作失败'); setBusy(false); } };
  return <div className="modal-mask"><div className="modal"><header><h2>收藏到暂存区</h2><button onClick={onClose}><X size={15}/></button></header><div className="modal-body"><div className="segments">{[['text','粘贴文本'],['file','上传文件'],['url','从网址收藏']].map(([key,label]) => <button key={key} className={way === key ? 'active' : ''} onClick={() => setWay(key as any)}>{label}</button>)}</div>{way === 'text' && <div className="form"><label>标题<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：推理延迟笔记"/></label><label>正文<textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴 Markdown 或纯文本"/></label></div>}{way === 'file' && <label className="dropzone"><Upload size={24}/>{file ? `${file.name} · ${formatBytes(file.size)}` : '点击选择文件，或把文件拖到这里'}<input type="file" accept=".md,.txt,.html,.pdf,.png,.jpg,.jpeg,.gif,.webp" onChange={(e) => setFile(e.target.files?.[0])}/></label>}{way === 'url' && <div className="form"><label>公开网址<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/file.pdf"/></label><p className="form-note">服务端保存最终响应原始字节，不抽取正文、不转 Markdown；逐跳执行 SSRF 校验，最大 50MB。</p></div>}{progress && <p className="progress-note">{progress}</p>}</div><footer><button onClick={onClose}>取消</button>{busy && way === 'url' ? <button onClick={async () => { if (job.current) await api.cancelUrlFetch(job.current); setBusy(false); setProgress('已取消，临时文件会被清理'); }}>取消抓取</button> : <button className="primary" disabled={busy} onClick={() => void submit()}>{busy ? '处理中…' : way === 'url' ? '保存到暂存区' : '存入 inbox/'}</button>}</footer></div></div>;
}
function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: (path: string) => void }) { const [title,setTitle]=useState(''); const [type,setType]=useState('summary'); const [error,setError]=useState(''); return <div className="modal-mask"><div className="modal small"><header><h2>新建 wiki 页面</h2><button onClick={onClose}><X size={15}/></button></header><div className="modal-body form"><label>页面标题<input value={title} onChange={(e)=>setTitle(e.target.value)} autoFocus/></label><label>类型<select value={type} onChange={(e)=>setType(e.target.value)}><option value="summary">摘要</option><option value="entity">实体</option><option value="concept">概念</option><option value="comparison">对比</option><option value="overview">综述</option><option value="synthesis">归档</option></select></label>{error && <p className="error">{error}</p>}</div><footer><button onClick={onClose}>取消</button><button className="primary" onClick={async()=>{try{const r=await api.createFile({title,type});onDone(r.file.path);}catch(e){setError(e instanceof Error?e.message:'创建失败');}}}>创建</button></footer></div></div>; }
function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`; return `${(bytes/1024/1024).toFixed(1)} MB`; }
