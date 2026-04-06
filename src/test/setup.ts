import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// 模拟 localStorage - 使用真实实现
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    _getStore() {
      return store;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// 模拟 IndexedDB - jsdom 不支持 IndexedDB
// 使用非 vi.fn 的方式确保不会被 clearAllMocks 清除
function createIDBRequestMock() {
  return {
    onerror: null as (() => void) | null,
    onsuccess: null as (() => void) | null,
    onupgradeneeded: null as (() => void) | null,
    result: null,
    error: null,
  };
}

const mockIndexedDB = {
  open: () => createIDBRequestMock(),
  deleteDatabase: () => ({
    onerror: null,
    onsuccess: null,
    onblocked: null,
  }),
};

Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
  configurable: true,
});

// 重置 localStorage 模拟
beforeEach(() => {
  localStorageMock.clear();
});
