// ISBN 缓存管理
import type { IsbnCacheEntry } from './types';
import type { Book } from '@/types';
import { indexedDbCache, isIndexedDbSupported } from './indexeddb';

// 缓存配置
const CACHE_CONFIG = {
  SUCCESS_TTL: 7 * 24 * 60 * 60 * 1000,  // 7 days for found books
  NULL_TTL: 60 * 60 * 1000,              // 1 hour for not-found ISBNs
  MAX_ENTRIES: 500,
  STORAGE_KEY: 'isbn_cache_v1'
};

// 内存缓存
class MemoryCache {
  private cache: Map<string, IsbnCacheEntry>;
  
  constructor() {
    this.cache = this.loadFromStorage();
  }
  
  private loadFromStorage(): Map<string, IsbnCacheEntry> {
    try {
      const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      }
    } catch {
      // Ignore parse errors
    }
    return new Map();
  }
  
  private saveToStorage(): void {
    try {
      const obj = Object.fromEntries(this.cache);
      localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Storage might be full, evict oldest entries
      this.evictOldest(50);
      try {
        const obj = Object.fromEntries(this.cache);
        localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(obj));
      } catch {
        // Give up if still failing
      }
    }
  }
  
  private evictOldest(count: number): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }
  
  get(isbn: string): IsbnCacheEntry | undefined {
    const entry = this.cache.get(isbn);
    if (!entry) return undefined;
    
    const now = Date.now();
    const ttl = entry.data ? CACHE_CONFIG.SUCCESS_TTL : CACHE_CONFIG.NULL_TTL;
    
    if (now - entry.timestamp > ttl) {
      this.cache.delete(isbn);
      this.saveToStorage();
      return undefined;
    }
    
    return entry;
  }
  
  set(isbn: string, data: Partial<Book> | null, source: string): void {
    // Evict if at capacity
    if (this.cache.size >= CACHE_CONFIG.MAX_ENTRIES) {
      this.evictOldest(10);
    }
    
    this.cache.set(isbn, {
      data,
      timestamp: Date.now(),
      source
    });
    this.saveToStorage();
  }
  
  clear(): void {
    this.cache.clear();
    localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
  }
  
  getStats(): { size: number } {
    return {
      size: this.cache.size
    };
  }
  
  delete(isbn: string): void {
    this.cache.delete(isbn);
    this.saveToStorage();
  }
  
  getAllIsbns(): string[] {
    return Array.from(this.cache.keys());
  }
}

// 缓存代理类，根据环境选择存储方案
class CacheProxy {
  private useIndexedDb: boolean;
  private memoryCache: MemoryCache;
  
  constructor() {
    this.useIndexedDb = isIndexedDbSupported();
    this.memoryCache = new MemoryCache();
    console.log(`[ISBN] 缓存存储方案: ${this.useIndexedDb ? 'IndexedDB' : 'localStorage'}`);
  }
  
  async get(isbn: string): Promise<IsbnCacheEntry | undefined> {
    if (this.useIndexedDb) {
      return await indexedDbCache.get(isbn);
    } else {
      return this.memoryCache.get(isbn);
    }
  }
  
  async set(isbn: string, data: Partial<Book> | null, source: string): Promise<void> {
    if (this.useIndexedDb) {
      await indexedDbCache.set(isbn, data, source);
    } else {
      this.memoryCache.set(isbn, data, source);
    }
  }
  
  async clear(): Promise<void> {
    if (this.useIndexedDb) {
      await indexedDbCache.clear();
    } else {
      this.memoryCache.clear();
    }
  }
  
  async getStats(): Promise<{ size: number }> {
    if (this.useIndexedDb) {
      return await indexedDbCache.getStats();
    } else {
      return this.memoryCache.getStats();
    }
  }
  
  async delete(isbn: string): Promise<void> {
    if (this.useIndexedDb) {
      await indexedDbCache.delete(isbn);
    } else {
      this.memoryCache.delete(isbn);
    }
  }
  
  async getAllIsbns(): Promise<string[]> {
    if (this.useIndexedDb) {
      return await indexedDbCache.getAllIsbns();
    } else {
      return this.memoryCache.getAllIsbns();
    }
  }

  // 本地ISBN数据库方法
  async addToLocalDatabase(isbn: string, bookData: Partial<Book>): Promise<void> {
    if (this.useIndexedDb) {
      await indexedDbCache.addToLocalDatabase(isbn, bookData);
    }
  }

  async getFromLocalDatabase(isbn: string): Promise<Partial<Book> | undefined> {
    if (this.useIndexedDb) {
      return await indexedDbCache.getFromLocalDatabase(isbn);
    }
    return undefined;
  }

  async deleteFromLocalDatabase(isbn: string): Promise<void> {
    if (this.useIndexedDb) {
      await indexedDbCache.deleteFromLocalDatabase(isbn);
    }
  }

  async clearLocalDatabase(): Promise<void> {
    if (this.useIndexedDb) {
      await indexedDbCache.clearLocalDatabase();
    }
  }

  async getLocalDatabaseStats(): Promise<{ size: number }> {
    if (this.useIndexedDb) {
      return await indexedDbCache.getLocalDatabaseStats();
    }
    return { size: 0 };
  }

  async searchLocalDatabase(query: string): Promise<Array<{ isbn: string; title: string; author: string }>> {
    if (this.useIndexedDb) {
      return await indexedDbCache.searchLocalDatabase(query);
    }
    return [];
  }
}

// 缓存单例
export const isbnCache = new CacheProxy();
