export type Zone = 'inbox' | 'raw' | 'wiki';
export type FileKind = 'md' | 'txt' | 'html' | 'pdf' | 'image';
export type InboxStatus = 'inbox' | 'review' | 'archived';

export interface Frontmatter {
  type?: string;
  title?: string;
  sources?: string[];
  aliases?: string[];
  tags?: string[];
  created?: string;
  updated?: string;
  saved?: string;
  status?: InboxStatus;
  source?: string;
  [key: string]: unknown;
}

export interface FileEntry {
  path: string;
  name: string;
  title: string;
  kind: FileKind;
  zone: Zone;
  size: number;
  mtime: number;
  version: string;
  frontmatter: Frontmatter | null;
  category: string;
  editable: boolean;
  status?: InboxStatus;
  sourceUrl?: string;
  finalUrl?: string;
  contentType?: string;
  sha256?: string;
  publicPath?: string;
  savedAt?: string;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  zone: Zone;
  children?: TreeNode[];
  file?: FileEntry;
}

export interface DashboardData {
  counts: Record<string, number>;
  recent: FileEntry[];
  tags: Array<{ name: string; count: number }>;
  indexAvailable: boolean;
}

export interface SearchResult extends FileEntry {
  snippet?: string;
}

export interface FilePayload {
  file: FileEntry;
  content?: string;
  url?: string;
}

export interface TabInfo {
  key: string;
  label: string;
  count: number;
  description: string;
}

export interface StaticSiteData {
  generatedAt: string;
  rootName: string;
  files: FileEntry[];
  tree: TreeNode[];
  dashboard: DashboardData;
  tabs: TabInfo[];
  payloads: Record<string, FilePayload>;
  searchText: Record<string, string>;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
  conflict?: {
    diskContent: string;
    diskVersion: string;
  };
}
