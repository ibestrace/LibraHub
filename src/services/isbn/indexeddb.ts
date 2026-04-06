// IndexedDB 管理模块
import type { IsbnCacheEntry } from './types';
import type { Book } from '@/types';

// 数据库配置
const DB_CONFIG = {
  NAME: 'LibraHub',
  VERSION: 2,  // 升级版本
  STORES: {
    ISBN_CACHE: 'isbn_cache',
    ISBN_DATABASE: 'isbn_database'  // 本地ISBN数据库
  }
};

// 缓存配置
const CACHE_CONFIG = {
  SUCCESS_TTL: 7 * 24 * 60 * 60 * 1000,  // 7 days for found books
  NULL_TTL: 60 * 60 * 1000,              // 1 hour for not-found ISBNs
  MAX_ENTRIES: 500
};

// 本地数据库配置
const DB_CONFIG_LOCAL = {
  MAX_ENTRIES: 5000,  // 本地数据库最大条目数
  AUTO_CLEANUP: true   // 自动清理过期数据
};

export class IndexedDbCache {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * 初始化数据库
   */
  private async initDb(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建或更新缓存存储
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.ISBN_CACHE)) {
          const cacheStore = db.createObjectStore(DB_CONFIG.STORES.ISBN_CACHE, {
            keyPath: 'isbn'
          });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 创建本地ISBN数据库存储
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.ISBN_DATABASE)) {
          const dbStore = db.createObjectStore(DB_CONFIG.STORES.ISBN_DATABASE, {
            keyPath: 'isbn'
          });
          dbStore.createIndex('title', 'title', { unique: false });
          dbStore.createIndex('author', 'author', { unique: false });
          dbStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * 获取缓存条目
   */
  async get(isbn: string): Promise<IsbnCacheEntry | undefined> {
    try {
      const db = await this.initDb();
      
      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_CACHE, 'readonly');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_CACHE);
        const request = store.get(isbn);

        request.onsuccess = () => {
          const entry = request.result;
          if (!entry) {
            resolve(undefined);
            return;
          }

          // 检查是否过期
          const now = Date.now();
          const ttl = entry.data ? CACHE_CONFIG.SUCCESS_TTL : CACHE_CONFIG.NULL_TTL;

          if (now - entry.timestamp > ttl) {
            // 过期，删除条目
            const deleteTx = db.transaction(DB_CONFIG.STORES.ISBN_CACHE, 'readwrite');
            deleteTx.objectStore(DB_CONFIG.STORES.ISBN_CACHE).delete(isbn);
            deleteTx.commit();
            resolve(undefined);
          } else {
            resolve(entry);
          }
        };

        request.onerror = () => {
          resolve(undefined);
        };
      });
    } catch {
      return undefined;
    }
  }

  /**
   * 设置缓存条目
   */
  async set(isbn: string, data: Partial<Book> | null, source: string): Promise<void> {
    try {
      const db = await this.initDb();

      // 检查存储容量
      await this.checkCapacity(db);

      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_CACHE, 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_CACHE);
        
        const entry: IsbnCacheEntry & { isbn: string } = {
          isbn,
          data,
          timestamp: Date.now(),
          source
        };

        const request = store.put(entry);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          resolve();
        };
      });
    } catch {
      // 静默失败，回退到localStorage
    }
  }

  /**
   * 删除缓存条目
   */
  async delete(isbn: string): Promise<void> {
    try {
      const db = await this.initDb();

      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_CACHE, 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_CACHE);
        const request = store.delete(isbn);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          resolve();
        };
      });
    } catch {
      // 静默失败
    }
  }

  /**
   * 清空缓存
   */
  async clear(): Promise<void> {
    try {
      const db = await this.initDb();

      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_CACHE, 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_CACHE);
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          resolve();
        };
      });
    } catch {
      // 静默失败
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{ size: number }> {
    try {
      const db = await this.initDb();

      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_CACHE, 'readonly');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_CACHE);
        const request = store.count();

        request.onsuccess = () => {
          resolve({ size: request.result });
        };

        request.onerror = () => {
          resolve({ size: 0 });
        };
      });
    } catch {
      return { size: 0 };
    }
  }

  /**
   * 检查并维护存储容量
   */
  private async checkCapacity(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      const transaction = db.transaction(DB_CONFIG.STORES.ISBN_CACHE, 'readonly');
      const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_CACHE);
      const request = store.count();

      request.onsuccess = () => {
        const count = request.result;

        if (count >= CACHE_CONFIG.MAX_ENTRIES) {
          // 删除最旧的条目
          const deleteTx = db.transaction(DB_CONFIG.STORES.ISBN_CACHE, 'readwrite');
          const deleteStore = deleteTx.objectStore(DB_CONFIG.STORES.ISBN_CACHE);
          const index = deleteStore.index('timestamp');
          const deleteRequest = index.openCursor();

          let deleted = 0;
          const limit = Math.min(count - CACHE_CONFIG.MAX_ENTRIES + 10, 50);

          deleteRequest.onsuccess = () => {
            const cursor = deleteRequest.result;
            if (cursor && deleted < limit) {
              cursor.delete();
              deleted++;
              cursor.continue();
            } else {
              deleteTx.commit();
              resolve();
            }
          };

          deleteRequest.onerror = () => {
            resolve();
          };
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        resolve();
      };
    });
  }

  /**
   * 获取缓存中的所有ISBN
   */
  async getAllIsbns(): Promise<string[]> {
    try {
      const db = await this.initDb();

      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_CACHE, 'readonly');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_CACHE);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result as string[]);
        };

        request.onerror = () => {
          resolve([]);
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * 本地ISBN数据库方法
   */

  /**
   * 向本地数据库添加ISBN记录
   */
  async addToLocalDatabase(isbn: string, bookData: Partial<Book>): Promise<void> {
    try {
      const db = await this.initDb();

      // 检查数据库容量
      await this.checkLocalDatabaseCapacity(db);

      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_DATABASE, 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_DATABASE);
        
        const entry = {
          isbn,
          ...bookData,
          createdAt: Date.now()
        };

        const request = store.put(entry);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          resolve();
        };
      });
    } catch {
      // 静默失败
    }
  }

  /**
   * 从本地数据库获取ISBN记录
   */
  async getFromLocalDatabase(isbn: string): Promise<Partial<Book> | undefined> {
    try {
      const db = await this.initDb();

      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_DATABASE, 'readonly');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_DATABASE);
        const request = store.get(isbn);

        request.onsuccess = () => {
          const entry = request.result;
          if (entry) {
            // 移除内部字段
            const { isbn, createdAt, ...bookData } = entry;
            resolve(bookData);
          } else {
            resolve(undefined);
          }
        };

        request.onerror = () => {
          resolve(undefined);
        };
      });
    } catch {
      return undefined;
    }
  }

  /**
   * 从本地数据库删除ISBN记录
   */
  async deleteFromLocalDatabase(isbn: string): Promise<void> {
    try {
      const db = await this.initDb();

      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_DATABASE, 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_DATABASE);
        const request = store.delete(isbn);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          resolve();
        };
      });
    } catch {
      // 静默失败
    }
  }

  /**
   * 清空本地数据库
   */
  async clearLocalDatabase(): Promise<void> {
    try {
      const db = await this.initDb();

      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_DATABASE, 'readwrite');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_DATABASE);
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          resolve();
        };
      });
    } catch {
      // 静默失败
    }
  }

  /**
   * 获取本地数据库统计信息
   */
  async getLocalDatabaseStats(): Promise<{ size: number }> {
    try {
      const db = await this.initDb();

      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_DATABASE, 'readonly');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_DATABASE);
        const request = store.count();

        request.onsuccess = () => {
          resolve({ size: request.result });
        };

        request.onerror = () => {
          resolve({ size: 0 });
        };
      });
    } catch {
      return { size: 0 };
    }
  }

  /**
   * 搜索本地数据库
   */
  async searchLocalDatabase(query: string): Promise<Array<{ isbn: string; title: string; author: string }>> {
    try {
      const db = await this.initDb();

      return new Promise((resolve) => {
        const transaction = db.transaction(DB_CONFIG.STORES.ISBN_DATABASE, 'readonly');
        const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_DATABASE);
        const request = store.openCursor();

        const results: Array<{ isbn: string; title: string; author: string }> = [];
        const searchTerm = query.toLowerCase();

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            const entry = cursor.value;
            if (
              entry.title?.toLowerCase().includes(searchTerm) ||
              entry.author?.toLowerCase().includes(searchTerm) ||
              entry.isbn.includes(searchTerm)
            ) {
              results.push({
                isbn: entry.isbn,
                title: entry.title || '',
                author: entry.author || ''
              });
            }
            cursor.continue();
          } else {
            resolve(results);
          }
        };

        request.onerror = () => {
          resolve([]);
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * 检查并维护本地数据库容量
   */
  private async checkLocalDatabaseCapacity(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      const transaction = db.transaction(DB_CONFIG.STORES.ISBN_DATABASE, 'readonly');
      const store = transaction.objectStore(DB_CONFIG.STORES.ISBN_DATABASE);
      const request = store.count();

      request.onsuccess = () => {
        const count = request.result;

        if (count >= DB_CONFIG_LOCAL.MAX_ENTRIES) {
          // 删除最旧的条目
          const deleteTx = db.transaction(DB_CONFIG.STORES.ISBN_DATABASE, 'readwrite');
          const deleteStore = deleteTx.objectStore(DB_CONFIG.STORES.ISBN_DATABASE);
          const index = deleteStore.index('createdAt');
          const deleteRequest = index.openCursor();

          let deleted = 0;
          const limit = Math.min(count - DB_CONFIG_LOCAL.MAX_ENTRIES + 100, 200);

          deleteRequest.onsuccess = () => {
            const cursor = deleteRequest.result;
            if (cursor && deleted < limit) {
              cursor.delete();
              deleted++;
              cursor.continue();
            } else {
              deleteTx.commit();
              resolve();
            }
          };

          deleteRequest.onerror = () => {
            resolve();
          };
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        resolve();
      };
    });
  }
}

// 单例实例
export const indexedDbCache = new IndexedDbCache();

// 检测浏览器是否支持 IndexedDB
export const isIndexedDbSupported = () => {
  return 'indexedDB' in window || 'mozIndexedDB' in window || 'webkitIndexedDB' in window || 'msIndexedDB' in window;
};
