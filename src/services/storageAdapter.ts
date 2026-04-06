// StorageAdapter - 桥接 localStorage 和 IndexedDB 的适配器
// 当前默认使用 localStorage 以确保兼容性

import { IndexedDbService, STORES, type StoreName } from './indexedDb';

export type StorageBackend = 'localStorage' | 'indexedDB';

const STORAGE_KEYS = {
  BOOKS: 'library_books',
  MEMBERS: 'library_members',
  MEMBER_TYPES: 'library_member_types',
  BORROW_RECORDS: 'library_borrow_records',
  RESERVATIONS: 'library_reservations',
  CATEGORIES: 'library_categories',
  LOGS: 'library_logs',
  SETTINGS: 'library_settings',
  OPERATORS: 'library_operators',
  MEMBER_GROUPS: 'library_member_groups',
  READING_STATS: 'library_reading_stats'
} as const;

const STORE_KEY_MAP: Record<StoreName, string> = {
  BOOKS: STORAGE_KEYS.BOOKS,
  MEMBERS: STORAGE_KEYS.MEMBERS,
  MEMBER_TYPES: STORAGE_KEYS.MEMBER_TYPES,
  BORROW_RECORDS: STORAGE_KEYS.BORROW_RECORDS,
  RESERVATIONS: STORAGE_KEYS.RESERVATIONS,
  CATEGORIES: STORAGE_KEYS.CATEGORIES,
  LOGS: STORAGE_KEYS.LOGS,
  SETTINGS: STORAGE_KEYS.SETTINGS,
  MEMBER_GROUPS: STORAGE_KEYS.MEMBER_GROUPS,
  READING_STATS: STORAGE_KEYS.READING_STATS
};

export class StorageAdapter {
  private static backend: StorageBackend = 'indexedDB';
  private static initialized = false;

  static async init(): Promise<void> {
    if (this.initialized) return;
    if (this.backend === 'indexedDB') {
      await IndexedDbService.init();
    }
    this.initialized = true;
  }

  static setBackend(backend: StorageBackend): void {
    this.backend = backend;
    this.initialized = false;
  }

  static getBackend(): StorageBackend {
    return this.backend;
  }

  static isUsingIndexedDB(): boolean {
    return this.backend === 'indexedDB';
  }

  // 同步方法（保持向后兼容）
  static get<T>(key: string, defaultValue: T): T {
    if (this.backend === 'indexedDB') {
      console.warn('IndexedDB 模式下不支持同步 get，请使用异步方法');
    }
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): void {
    if (this.backend === 'indexedDB') {
      console.warn('IndexedDB 模式下不支持同步 set，请使用异步方法');
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing ${key}:`, error);
      throw new Error('存储空间不足');
    }
  }

  static remove(key: string): void {
    localStorage.removeItem(key);
  }

  // 异步方法
  static async getAsync<T>(key: string, defaultValue: T): Promise<T> {
    await this.init();
    if (this.backend === 'indexedDB') {
      const storeEntry = Object.entries(STORE_KEY_MAP).find(([_, k]) => k === key);
      if (storeEntry) {
        const [storeKey] = storeEntry;
        const items = await IndexedDbService.getAll(storeKey as StoreName);
        return (items as T) ?? defaultValue;
      }
    }
    return this.get(key, defaultValue);
  }

  static async setAsync<T>(key: string, value: T): Promise<void> {
    await this.init();
    if (this.backend === 'indexedDB') {
      const storeEntry = Object.entries(STORE_KEY_MAP).find(([_, k]) => k === key);
      if (storeEntry) {
        const [storeKey] = storeEntry;
        const items = Array.isArray(value) ? value : [value];
        await IndexedDbService.bulkPut(storeKey as StoreName, items as Array<{ id: string }>);
        return;
      }
    }
    this.set(key, value);
  }

  // 实体操作 - 异步
  static async getAll<T extends { id: string }>(storeKey: StoreName): Promise<T[]> {
    await this.init();
    if (this.backend === 'indexedDB') {
      return IndexedDbService.getAll<T>(storeKey);
    }
    const key = STORE_KEY_MAP[storeKey];
    return this.get<T[]>(key, []);
  }

  static async getById<T extends { id: string }>(storeKey: StoreName, id: string): Promise<T | undefined> {
    await this.init();
    if (this.backend === 'indexedDB') {
      return IndexedDbService.getById<T>(storeKey, id);
    }
    const items = await this.getAll<T>(storeKey);
    return items.find(item => item.id === id);
  }

  static async add<T extends { id: string }>(storeKey: StoreName, item: T): Promise<T> {
    await this.init();
    if (this.backend === 'indexedDB') {
      return IndexedDbService.add(storeKey, item);
    }
    const items = await this.getAll<T>(storeKey);
    items.push(item);
    this.set(STORE_KEY_MAP[storeKey], items);
    return item;
  }

  static async update<T extends { id: string }>(storeKey: StoreName, item: T): Promise<T> {
    await this.init();
    if (this.backend === 'indexedDB') {
      return IndexedDbService.update(storeKey, item);
    }
    const items = await this.getAll<T>(storeKey);
    const index = items.findIndex(i => i.id === item.id);
    if (index !== -1) {
      items[index] = item;
      this.set(STORE_KEY_MAP[storeKey], items);
    }
    return item;
  }

  static async delete(storeKey: StoreName, id: string): Promise<void> {
    await this.init();
    if (this.backend === 'indexedDB') {
      await IndexedDbService.delete(storeKey, id);
      return;
    }
    const items = await this.getAll<{ id: string }>(storeKey);
    const filtered = items.filter(item => item.id !== id);
    this.set(STORE_KEY_MAP[storeKey], filtered);
  }

  static async bulkUpdate<T extends { id: string }>(storeKey: StoreName, items: T[]): Promise<void> {
    await this.init();
    if (this.backend === 'indexedDB') {
      await IndexedDbService.bulkPut(storeKey, items);
      return;
    }
    this.set(STORE_KEY_MAP[storeKey], items);
  }

  static async getSingleton<T>(storeKey: StoreName): Promise<T | null> {
    await this.init();
    if (this.backend === 'indexedDB') {
      const items = await IndexedDbService.getAll<T & { id: string }>(storeKey);
      return items.length > 0 ? (items[0] as unknown as T) : null;
    }
    const key = STORE_KEY_MAP[storeKey];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  static async setSingleton<T>(storeKey: StoreName, value: T): Promise<void> {
    await this.init();
    if (this.backend === 'indexedDB') {
      await IndexedDbService.bulkPut(storeKey, [{ ...(value as object), id: 'singleton' }]);
      return;
    }
    const key = STORE_KEY_MAP[storeKey];
    localStorage.setItem(key, JSON.stringify(value));
  }

  static exportAll(): string {
    const data = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      books: this.get(STORAGE_KEYS.BOOKS, []),
      members: this.get(STORAGE_KEYS.MEMBERS, []),
      memberTypes: this.get(STORAGE_KEYS.MEMBER_TYPES, []),
      borrowRecords: this.get(STORAGE_KEYS.BORROW_RECORDS, []),
      reservations: this.get(STORAGE_KEYS.RESERVATIONS, []),
      categories: this.get(STORAGE_KEYS.CATEGORIES, []),
      logs: this.get(STORAGE_KEYS.LOGS, []),
      settings: this.get(STORAGE_KEYS.SETTINGS, {}),
      memberGroups: this.get(STORAGE_KEYS.MEMBER_GROUPS, []),
      readingStats: this.get(STORAGE_KEYS.READING_STATS, [])
    };
    return JSON.stringify(data, null, 2);
  }

  static importAll(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.books) this.set(STORAGE_KEYS.BOOKS, data.books);
      if (data.members) this.set(STORAGE_KEYS.MEMBERS, data.members);
      if (data.memberTypes) this.set(STORAGE_KEYS.MEMBER_TYPES, data.memberTypes);
      if (data.borrowRecords) this.set(STORAGE_KEYS.BORROW_RECORDS, data.borrowRecords);
      if (data.reservations) this.set(STORAGE_KEYS.RESERVATIONS, data.reservations);
      if (data.categories) this.set(STORAGE_KEYS.CATEGORIES, data.categories);
      if (data.logs) this.set(STORAGE_KEYS.LOGS, data.logs);
      if (data.settings) this.set(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.memberGroups) this.set(STORAGE_KEYS.MEMBER_GROUPS, data.memberGroups);
      if (data.readingStats) this.set(STORAGE_KEYS.READING_STATS, data.readingStats);
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
}

export { STORES };
