import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, File, FileImage, FileText, Folder, LockKeyhole, MoreHorizontal, Plus } from 'lucide-react';
import type { TreeNode, Zone } from '../types';

const zoneInfo: Record<Zone, { title: string; badge: string }> = {
  inbox: { title: '暂存区', badge: '暂存 · 可写' }, raw: { title: '原始资料', badge: '原始 · 只读' }, wiki: { title: '派生层', badge: '派生 · 可编辑' },
};
function KindIcon({ kind }: { kind?: string }) {
  if (kind === 'image') return <FileImage size={14} />;
  if (kind === 'pdf' || kind === 'html') return <File size={14} />;
  return <FileText size={14} />;
}

function NodeRow({ node, current, onOpen, onAction, readOnly }: { node: TreeNode; current?: string; onOpen: (path: string) => void; onAction: (action: 'edit'|'rename'|'delete', path: string) => void; readOnly: boolean }) {
  const [open, setOpen] = useState(true); const [menu, setMenu] = useState(false);
  useEffect(() => { if (!menu) return; const close = () => setMenu(false); window.addEventListener('click', close); return () => window.removeEventListener('click', close); }, [menu]);
  if (node.type === 'directory') return <div className="tree-folder-wrap">
    <button className="tree-folder" onClick={() => setOpen((v) => !v)}>{open ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}<Folder size={13}/><span>{node.name}</span><b>{node.children?.length || 0}</b></button>
    {open && <div>{node.children?.map((child) => <NodeRow key={child.path} node={child} current={current} onOpen={onOpen} onAction={onAction} readOnly={readOnly}/>)}</div>}
  </div>;
  const editable = Boolean(node.file?.editable) && !readOnly;
  return <div className="tree-file-wrap">
    <button className={`tree-file ${current === node.path ? 'active' : ''}`} title={node.path} onClick={() => onOpen(node.path)}>
      <KindIcon kind={node.file?.kind}/><span>{node.file?.title || node.name}</span>
      {editable && <i onClick={(event) => { event.stopPropagation(); setMenu(true); }}><MoreHorizontal size={14}/></i>}
    </button>
    {menu && <div className="tree-menu" onClick={(event) => event.stopPropagation()}>
      <button onClick={() => onAction('edit', node.path)}>编辑</button><button onClick={() => onAction('rename', node.path)}>重命名</button><button onClick={() => onAction('delete', node.path)}>删除</button>
    </div>}
  </div>;
}

export function Sidebar({ tree, current, onOpen, onAction, onCreate, readOnly = false }: { tree: TreeNode[]; current?: string; onOpen: (path: string) => void; onAction: (action: 'edit'|'rename'|'delete', path: string) => void; onCreate: () => void; readOnly?: boolean }) {
  const zones = useMemo(() => tree.filter((node) => node.type === 'directory') as TreeNode[], [tree]);
  return <aside className="sidebar">
    {zones.map((root) => {
      const zone = root.zone; const info = zoneInfo[zone];
      return <section className="tree-zone" key={root.path}>
        <header><span>{info.title}</span><small className={`zone-badge zone-${zone}`}>{zone === 'raw' && <LockKeyhole size={10}/>} {readOnly ? '公开 · 只读' : info.badge}</small>{zone === 'wiki' && !readOnly && <button className="icon-button" onClick={onCreate} title="新建 wiki 页面"><Plus size={14}/></button>}</header>
        {root.children?.map((node) => <NodeRow key={node.path} node={node} current={current} onOpen={onOpen} onAction={onAction} readOnly={readOnly}/>) }
      </section>;
    })}
    <div className="tree-note"><BookOpen size={13}/>{readOnly ? 'GitHub Pages 静态只读模式' : 'raw 只读 · inbox 与 wiki 可编辑'}</div>
  </aside>;
}
