// IndexedDB 存储服务 - 突破 localStorage 5MB 限制
// 可用于存储更大数据量的图书馆数据

const DB_NAME = 'LibraHub';
const DB_VERSION = 1;

// 对象仓库名称
const STORES = {
  BOOKS: 'books',
  MEMBERS: 'members',
  MEMBER_TYPES: 'member_types',
  BORROW_RECORDS: 'borrow_records',
  RESERVATIONS: 'reservations',
  CATEGORIES: 'categories',
  LOGS: 'logs',
  SETTINGS: 'settings',
  MEMBER_GROUPS: 'member_groups',
  READING_STATS: 'reading_stats'
} as const;

type StoreName = keyof typeof STORES;

// 索引配置 - 使用与 STORES 相同的键
const INDEX_CONFIG: Record<keyof typeof STORES, Array<{ name: string; keyPath: string; unique?: boolean }>> = {
  BOOKS: [
    { name: 'barcode', keyPath: 'barcode', unique: true },
    { name: 'isbn', keyPath: 'isbn', unique: false },
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'categoryId', keyPath: 'categoryId', unique: false }
  ],
  MEMBERS: [
    { name: 'cardNumber', keyPath: 'cardNumber', unique: true },
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'groupId', keyPath: 'groupId', unique: false }
  ],
  MEMBER_TYPES: [],
  BORROW_RECORDS: [
    { name: 'bookId', keyPath: 'bookId', unique: false },
    { name: 'memberId', keyPath: 'memberId', unique: false },
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'borrowDate', keyPath: 'borrowDate', unique: false }
  ],
  RESERVATIONS: [],
  CATEGORIES: [],
  LOGS: [
    { name: 'type', keyPath: 'type', unique: false },
    { name: 'createdAt', keyPath: 'createdAt', unique: false }
  ],
  SETTINGS: [],
  MEMBER_GROUPS: [],
  READING_STATS: [
    { name: 'memberId', keyPath: 'memberId', unique: false },
    { name: 'yearMonth', keyPath: 'yearMonth', unique: false }
  ]
};

export class IndexedDbService {
  private static db: IDBDatabase | null = null;
  private static initPromise: Promise<void> | null = null;

  /**
   * 初始化数据库
   */
  static async init(): Promise<void> {
    if (this.db) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error);
        reject(request.error);
        this.initPromise = null;
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB 初始化成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('IndexedDB 版本升级，创建对象仓库...');

        // 创建所有对象仓库和索引
        Object.entries(STORES).forEach(([storeKey, storeName]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            
            // 创建索引
            const indexes = INDEX_CONFIG[storeKey as StoreName] || [];
            indexes.forEach(index => {
              store.createIndex(index.name, index.keyPath, { unique: index.unique ?? false });
            });
            
            console.log(`创建对象仓库：${storeName}`);
          }
        });
      };
    });

    return this.initPromise;
  }

  /**
   * 确保数据库已初始化
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }

  /**
   * 添加数据
   */
  static async add<T extends { id: string }>(storeName: StoreName, data: T): Promise<T> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => {
        console.error('添加数据失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 更新数据
   */
  static async update<T extends { id: string }>(storeName: StoreName, data: T): Promise<T> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => {
        console.error('更新数据失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 删除数据
   */
  static async delete(storeName: StoreName, id: string): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('删除数据失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 根据 ID 获取数据
   */
  static async getById<T>(storeName: StoreName, id: string): Promise<T | undefined> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('获取数据失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 获取所有数据
   */
  static async getAll<T>(storeName: StoreName): Promise<T[]> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('获取所有数据失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 通过索引获取数据
   */
  static async getByIndex<T>(
    storeName: StoreName, 
    indexName: string, 
    value: any
  ): Promise<T | undefined> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('通过索引获取数据失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 通过索引查询数据（支持多结果）
   */
  static async queryByIndex<T>(
    storeName: StoreName, 
    indexName: string, 
    value: any
  ): Promise<T[]> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('查询数据失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 批量添加/更新数据
   */
  static async bulkPut<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      items.forEach(item => {
        store.put(item);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.error('批量更新数据失败:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * 清空对象仓库
   */
  static async clear(storeName: StoreName): Promise<void> {
    await this.ensureInitialized();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('清空数据失败:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 清空所有数据
   */
  static async clearAll(): Promise<void> {
    await this.ensureInitialized();
    
    const transaction = this.db!.transaction(
      Object.values(STORES), 
      'readwrite'
    );

    return new Promise((resolve, reject) => {
      Object.values(STORES).forEach(storeName => {
        transaction.objectStore(storeName).clear();
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => {
        console.error('清空所有数据失败:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * 导出数据（用于备份）
   */
  static async exportAll(): Promise<Record<string, any>> {
    await this.ensureInitialized();
    
    const result: Record<string, any> = {
      version: '1.0',
      exportTime: new Date().toISOString()
    };

    const promises = Object.entries(STORES).map(async ([key, storeName]) => {
      const data = await this.getAll(storeName as StoreName);
      result[key.toLowerCase()] = data;
    });

    await Promise.all(promises);
    return result;
  }

  /**
   * 导入数据（用于恢复）
   */
  static async importAll(data: Record<string, any>): Promise<void> {
    await this.ensureInitialized();
    
    const promises = Object.entries(STORES).map(async ([key, storeName]) => {
      const storeData = data[key.toLowerCase()];
      if (Array.isArray(storeData) && storeData.length > 0) {
        await this.bulkPut(storeName as StoreName, storeData);
      }
    });

    await Promise.all(promises);
  }

  /**
   * 获取数据库统计信息
   */
  static async getStats(): Promise<Record<string, number>> {
    await this.ensureInitialized();
    
    const stats: Record<string, number> = {};
    
    const promises = Object.entries(STORES).map(async ([key, storeName]) => {
      const data = await this.getAll(storeName as StoreName);
      stats[key] = data.length;
    });

    await Promise.all(promises);
    return stats;
  }

  /**
   * 关闭数据库连接
   */
  static close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// 导出存储名称映射
export { STORES };
