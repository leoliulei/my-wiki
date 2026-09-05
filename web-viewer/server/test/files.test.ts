import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { absolutePath, kindOf, normalizeRelative, sanitizeName, zoneOf } from '../src/files.js';
import { WIKI_ROOT } from '../src/config.js';

describe('文件系统安全边界', () => {
  it('只允许三区内的相对路径', () => {
    expect(normalizeRelative('wiki/entities/a.md')).toBe('wiki/entities/a.md');
    expect(zoneOf('raw/a.pdf')).toBe('raw');
    expect(() => normalizeRelative('../../etc/passwd')).toThrow();
    expect(() => normalizeRelative('/etc/passwd')).toThrow();
    expect(() => normalizeRelative('web-viewer/package.json')).toThrow();
  });

  it('绝对路径始终留在知识库根目录', () => {
    expect(absolutePath('inbox/files/a.pdf')).toBe(path.join(WIKI_ROOT, 'inbox/files/a.pdf'));
  });

  it('识别支持的文件类型并清理文件名', () => {
    expect(kindOf('x/a.html')).toBe('html');
    expect(kindOf('x/a.pdf')).toBe('pdf');
    expect(kindOf('x/a.webp')).toBe('image');
    expect(sanitizeName('../危险:文件?.pdf')).toBe('-危险-文件-.pdf');
  });
});
