// Unified Storage Service - 统一存储抽象层
// 支持 localStorage 和 IndexedDB 两种后端
// 提供一致的异步 API，便于迁移和切换

import type {
  Book,
  Member,
  MemberType,
  BorrowRecord,
  BookCategory,
  OperationLog,
  SystemSettings,
  MemberGroup,
  ReadingStats,
  ReservationRecord
} from '@/types';

// 存储后端类型
export type StorageBackend = 'localStorage' | 'indexedDB';

// 本地存储键名
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

// IndexedDB 对象仓库名称（与 indexedDb.ts 保持一致）
const IDB_STORES = {
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

type StoreName = keyof typeof STORAGE_KEYS;

/**
 * UnifiedStorage 统一存储服务
 * 提供统一的异步 API，底层可使用 localStorage 或 IndexedDB
 */
export class UnifiedStorage {
  private backend: StorageBackend;
  private idb: typeof import('./indexedDb').IndexedDbService | null = null;

  constructor(backend: StorageBackend = 'indexedDB') {
    this.backend = backend;
    
    // 延迟加载 IndexedDB 服务
    if (backend === 'indexedDB') {
      this.initIndexedDB();
    }
  }

  private async initIndexedDB(): Promise<void> {
    const { IndexedDbService } = await import('./indexedDb');
    this.idb = IndexedDbService;
    await IndexedDbService.init();
  }

  /**
   * 获取当前使用的后端类型
   */
  getBackend(): StorageBackend {
    return this.backend;
  }

  /**
   * 切换后端（会重新初始化）
   */
  async switchBackend(backend: StorageBackend): Promise<void> {
    this.backend = backend;
    if (backend === 'indexedDB') {
      await this.initIndexedDB();
    }
  }

  // ==================== 通用 CRUD 方法 ====================

  /**
   * 获取所有数据
   */
  private async getAll<T>(key: StoreName): Promise<T[]> {
    if (this.backend === 'indexedDB' && this.idb) {
      const storeName = this.mapToIdbStore(key);
      return this.idb.getAll<T>(storeName as any);
    } else {
      return this.getFromLocalStorage<T[]>(STORAGE_KEYS[key], []);
    }
  }

  /**
   * 根据 ID 获取单个数据
   */
  private async getById<T extends { id: string }>(key: StoreName, id: string): Promise<T | undefined> {
    if (this.backend === 'indexedDB' && this.idb) {
      const storeName = this.mapToIdbStore(key);
      return this.idb.getById<T>(storeName as any, id);
    } else {
      const items = this.getFromLocalStorage<T[]>(STORAGE_KEYS[key], []);
      return items.find(item => item.id === id);
    }
  }

  /**
   * 保存数据（新增或更新）
   */
  private async save<T extends { id: string }>(key: StoreName, item: T): Promise<T> {
    if (this.backend === 'indexedDB' && this.idb) {
      const storeName = this.mapToIdbStore(key);
      const existing = await this.idb.getById<T>(storeName as any, item.id);
      if (existing) {
        return this.idb.update(storeName as any, item);
      } else {
        return this.idb.add(storeName as any, item);
      }
    } else {
      const items = this.getFromLocalStorage<T[]>(STORAGE_KEYS[key], []);
      const index = items.findIndex(i => i.id === item.id);
      if (index >= 0) {
        items[index] = item;
      } else {
        items.push(item);
      }
      this.saveToLocalStorage(STORAGE_KEYS[key], items);
      return item;
    }
  }

  /**
   * 批量保存数据
   */
  private async saveMany<T extends { id: string }>(key: StoreName, items: T[]): Promise<void> {
    if (this.backend === 'indexedDB' && this.idb) {
      const storeName = this.mapToIdbStore(key);
      await this.idb.bulkPut(storeName as any, items);
    } else {
      this.saveToLocalStorage(STORAGE_KEYS[key], items);
    }
  }

  /**
   * 删除数据
   */
  private async delete(key: StoreName, id: string): Promise<void> {
    if (this.backend === 'indexedDB' && this.idb) {
      const storeName = this.mapToIdbStore(key);
      await this.idb.delete(storeName as any, id);
    } else {
      const items = this.getFromLocalStorage<{ id: string }[]>(STORAGE_KEYS[key], []);
      const filtered = items.filter(item => item.id !== id);
      this.saveToLocalStorage(STORAGE_KEYS[key], filtered);
    }
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    if (this.backend === 'indexedDB' && this.idb) {
      await this.idb.clearAll();
    } else {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }

  // ==================== localStorage 辅助方法 ====================

  private getFromLocalStorage<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return defaultValue;
    }
  }

  private saveToLocalStorage<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing ${key}:`, error);
      throw new Error('存储空间不足，请备份数据后清理');
    }
  }

  // ==================== 存储键映射 ====================

  private mapToIdbStore(key: StoreName): string {
    const mapping: Record<StoreName, string> = {
      BOOKS: IDB_STORES.BOOKS,
      MEMBERS: IDB_STORES.MEMBERS,
      MEMBER_TYPES: IDB_STORES.MEMBER_TYPES,
      BORROW_RECORDS: IDB_STORES.BORROW_RECORDS,
      RESERVATIONS: IDB_STORES.RESERVATIONS,
      CATEGORIES: IDB_STORES.CATEGORIES,
      LOGS: IDB_STORES.LOGS,
      SETTINGS: IDB_STORES.SETTINGS,
      OPERATORS: 'operators',
      MEMBER_GROUPS: IDB_STORES.MEMBER_GROUPS,
      READING_STATS: IDB_STORES.READING_STATS
    };
    return mapping[key];
  }

  // ==================== 书籍相关方法 ====================

  async getBooks(): Promise<Book[]> {
    return this.getAll<Book>('BOOKS');
  }

  async getBookById(id: string): Promise<Book | undefined> {
    return this.getById<Book>('BOOKS', id);
  }

  async saveBook(book: Book): Promise<Book> {
    return this.save<Book>('BOOKS', book);
  }

  async saveBooks(books: Book[]): Promise<void> {
    return this.saveMany<Book>('BOOKS', books);
  }

  async deleteBook(id: string): Promise<void> {
    return this.delete('BOOKS', id);
  }

  // ==================== 会员相关方法 ====================

  async getMembers(): Promise<Member[]> {
    return this.getAll<Member>('MEMBERS');
  }

  async getMemberById(id: string): Promise<Member | undefined> {
    return this.getById<Member>('MEMBERS', id);
  }

  async saveMember(member: Member): Promise<Member> {
    return this.save<Member>('MEMBERS', member);
  }

  async saveMembers(members: Member[]): Promise<void> {
    return this.saveMany<Member>('MEMBERS', members);
  }

  async deleteMember(id: string): Promise<void> {
    return this.delete('MEMBERS', id);
  }

  // ==================== 会员类型相关方法 ====================

  async getMemberTypes(): Promise<MemberType[]> {
    return this.getAll<MemberType>('MEMBER_TYPES');
  }

  async saveMemberType(memberType: MemberType): Promise<MemberType> {
    return this.save<MemberType>('MEMBER_TYPES', memberType);
  }

  async saveMemberTypes(memberTypes: MemberType[]): Promise<void> {
    return this.saveMany<MemberType>('MEMBER_TYPES', memberTypes);
  }

  async deleteMemberType(id: string): Promise<void> {
    return this.delete('MEMBER_TYPES', id);
  }

  // ==================== 借阅记录相关方法 ====================

  async getBorrowRecords(): Promise<BorrowRecord[]> {
    return this.getAll<BorrowRecord>('BORROW_RECORDS');
  }

  async getBorrowRecordById(id: string): Promise<BorrowRecord | undefined> {
    return this.getById<BorrowRecord>('BORROW_RECORDS', id);
  }

  async saveBorrowRecord(record: BorrowRecord): Promise<BorrowRecord> {
    return this.save<BorrowRecord>('BORROW_RECORDS', record);
  }

  async saveBorrowRecords(records: BorrowRecord[]): Promise<void> {
    return this.saveMany<BorrowRecord>('BORROW_RECORDS', records);
  }

  async deleteBorrowRecord(id: string): Promise<void> {
    return this.delete('BORROW_RECORDS', id);
  }

  // ==================== 书籍分类相关方法 ====================

  async getCategories(): Promise<BookCategory[]> {
    return this.getAll<BookCategory>('CATEGORIES');
  }

  async saveCategory(category: BookCategory): Promise<BookCategory> {
    return this.save<BookCategory>('CATEGORIES', category);
  }

  async saveCategories(categories: BookCategory[]): Promise<void> {
    return this.saveMany<BookCategory>('CATEGORIES', categories);
  }

  async deleteCategory(id: string): Promise<void> {
    return this.delete('CATEGORIES', id);
  }

  // ==================== 预约记录相关方法 ====================

  async getReservations(): Promise<ReservationRecord[]> {
    return this.getAll<ReservationRecord>('RESERVATIONS');
  }

  async saveReservation(reservation: ReservationRecord): Promise<ReservationRecord> {
    return this.save<ReservationRecord>('RESERVATIONS', reservation);
  }

  async deleteReservation(id: string): Promise<void> {
    return this.delete('RESERVATIONS', id);
  }

  // ==================== 操作日志相关方法 ====================

  async getLogs(): Promise<OperationLog[]> {
    return this.getAll<OperationLog>('LOGS');
  }

  async saveLog(log: OperationLog): Promise<OperationLog> {
    return this.save<OperationLog>('LOGS', log);
  }

  async deleteLog(id: string): Promise<void> {
    return this.delete('LOGS', id);
  }

  // ==================== 系统设置相关方法 ====================

  async getSettings(): Promise<SystemSettings> {
    if (this.backend === 'indexedDB' && this.idb) {
      const settings = await this.idb.getAll<SystemSettings>(IDB_STORES.SETTINGS as any);
      return settings[0] || this.getDefaultSettings();
    } else {
      return this.getFromLocalStorage<SystemSettings>(STORAGE_KEYS.SETTINGS, this.getDefaultSettings());
    }
  }

  async saveSettings(settings: SystemSettings): Promise<SystemSettings> {
    if (this.backend === 'indexedDB' && this.idb) {
      // IndexedDB 设置使用 id 'default'
      const settingsWithId = { ...settings, id: 'default' };
      const existing = await this.idb.getById(IDB_STORES.SETTINGS as any, 'default');
      if (existing) {
        await this.idb.update(IDB_STORES.SETTINGS as any, settingsWithId as any);
      } else {
        await this.idb.add(IDB_STORES.SETTINGS as any, settingsWithId as any);
      }
      return settings;
    } else {
      this.saveToLocalStorage(STORAGE_KEYS.SETTINGS, settings);
      return settings;
    }
  }

  private getDefaultSettings(): SystemSettings {
    return {
      libraryName: '图书馆',
      maxBorrowDays: 30,
      maxRenewTimes: 2,
      renewDays: 15,
      overdueFinePerDay: 0.5,
      allowOverdueBorrow: false
    };
  }

  // ==================== 会员分组相关方法 ====================

  async getMemberGroups(): Promise<MemberGroup[]> {
    return this.getAll<MemberGroup>('MEMBER_GROUPS');
  }

  async saveMemberGroup(group: MemberGroup): Promise<MemberGroup> {
    return this.save<MemberGroup>('MEMBER_GROUPS', group);
  }

  async deleteMemberGroup(id: string): Promise<void> {
    return this.delete('MEMBER_GROUPS', id);
  }

  // ==================== 阅读统计相关方法 ====================

  async getReadingStats(): Promise<ReadingStats[]> {
    return this.getAll<ReadingStats>('READING_STATS');
  }

  async saveReadingStats(stats: ReadingStats): Promise<ReadingStats> {
    return this.save<ReadingStats>('READING_STATS', stats);
  }

  // ==================== 数据导出/导入 ====================

  /**
   * 导出所有数据（用于备份）
   */
  async exportAll(): Promise<string> {
    const data = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      books: await this.getBooks(),
      members: await this.getMembers(),
      memberTypes: await this.getMemberTypes(),
      borrowRecords: await this.getBorrowRecords(),
      reservations: await this.getReservations(),
      categories: await this.getCategories(),
      logs: await this.getLogs(),
      settings: await this.getSettings(),
      memberGroups: await this.getMemberGroups(),
      readingStats: await this.getReadingStats()
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导入所有数据（用于恢复）
   */
  async importAll(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.books) await this.saveBooks(data.books);
      if (data.members) await this.saveMembers(data.members);
      if (data.memberTypes) await this.saveMemberTypes(data.memberTypes);
      if (data.borrowRecords) await this.saveBorrowRecords(data.borrowRecords);
      if (data.reservations) {
        for (const r of data.reservations) {
          await this.saveReservation(r);
        }
      }
      if (data.categories) await this.saveCategories(data.categories);
      if (data.logs) {
        for (const log of data.logs) {
          await this.saveLog(log);
        }
      }
      if (data.settings) await this.saveSettings(data.settings);
      if (data.memberGroups) {
        for (const group of data.memberGroups) {
          await this.saveMemberGroup(group);
        }
      }
      if (data.readingStats) {
        for (const stats of data.readingStats) {
          await this.saveReadingStats(stats);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getStats(): Promise<Record<string, number>> {
    return {
      books: (await this.getBooks()).length,
      members: (await this.getMembers()).length,
      memberTypes: (await this.getMemberTypes()).length,
      borrowRecords: (await this.getBorrowRecords()).length,
      reservations: (await this.getReservations()).length,
      categories: (await this.getCategories()).length,
      logs: (await this.getLogs()).length,
      memberGroups: (await this.getMemberGroups()).length,
      readingStats: (await this.getReadingStats()).length
    };
  }
}

// 导出单例实例（使用 IndexedDB 作为默认后端）
export const storage = new UnifiedStorage('indexedDB');
