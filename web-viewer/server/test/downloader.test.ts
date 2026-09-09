import { describe, expect, it } from 'vitest';
import type { LookupAddress } from 'node:dns';
import { createPinnedLookupForTest } from '../src/downloader.js';

describe('固定 DNS 解析回调', () => {
  it('在普通 lookup 模式返回单个地址', async () => {
    const lookup = createPinnedLookupForTest('203.0.113.10', 4);
    await new Promise<void>((resolve, reject) => {
      lookup('example.test', { all: false }, (error, address, family) => {
        try {
          expect(error).toBeNull();
          expect(address).toBe('203.0.113.10');
          expect(family).toBe(4);
          resolve();
        } catch (cause) { reject(cause); }
      });
    });
  });

  it('在 all 模式返回地址数组，兼容 Node 22 及更新版本', async () => {
    const lookup = createPinnedLookupForTest('2001:4860:4860::8888', 6);
    await new Promise<void>((resolve, reject) => {
      lookup('example.test', { all: true }, (error, addresses) => {
        try {
          expect(error).toBeNull();
          expect(addresses as LookupAddress[]).toEqual([{ address: '2001:4860:4860::8888', family: 6 }]);
          resolve();
        } catch (cause) { reject(cause); }
      });
    });
  });
});
