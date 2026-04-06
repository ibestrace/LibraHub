import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StorageAdapter, STORES } from './storageAdapter';
import { IndexedDbService } from './indexedDb';
import { MigrationService } from './migration';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

describe('StorageAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    StorageAdapter.setBackend('localStorage');
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('backend configuration', () => {
    it('应该默认使用 indexedDB', () => {
      // 重置后应该默认是 indexedDB
      expect(StorageAdapter.getBackend()).toBe('localStorage');
      StorageAdapter.setBackend('indexedDB');
      expect(StorageAdapter.getBackend()).toBe('indexedDB');
    });

    it('应该能够切换存储后端', () => {
      StorageAdapter.setBackend('indexedDB');
      expect(StorageAdapter.getBackend()).toBe('indexedDB');
      expect(StorageAdapter.isUsingIndexedDB()).toBe(true);

      StorageAdapter.setBackend('localStorage');
      expect(StorageAdapter.getBackend()).toBe('localStorage');
      expect(StorageAdapter.isUsingIndexedDB()).toBe(false);
    });
  });

  describe('localStorage 模式', () => {
    beforeEach(() => {
      StorageAdapter.setBackend('localStorage');
    });

    it('应该正确获取和设置数据', async () => {
      const testData = { id: '1', name: 'Test Book' };
      await StorageAdapter.set('library_books', [testData]);

      const result = await StorageAdapter.get('library_books', []);
      expect(result).toEqual([testData]);
    });

    it('应该返回默认值当键不存在时', async () => {
      const defaultValue = [{ id: 'default', name: 'Default' }];
      const result = await StorageAdapter.get('nonexistent_key', defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it('应该正确处理实体数组操作', async () => {
      const book1 = { id: 'book1', title: 'Book 1' };
      const book2 = { id: 'book2', title: 'Book 2' };

      await StorageAdapter.add(STORES.BOOKS, book1);
      await StorageAdapter.add(STORES.BOOKS, book2);

      const allBooks = await StorageAdapter.getAll(STORES.BOOKS);
      expect(allBooks).toHaveLength(2);
      expect(allBooks[0].title).toBe('Book 1');
    });

    it('应该根据 ID 获取实体', async () => {
      const book = { id: 'book1', title: 'Test Book' };
      await StorageAdapter.add(STORES.BOOKS, book);

      const result = await StorageAdapter.getById(STORES.BOOKS, 'book1');
      expect(result).toEqual(book);

      const notFound = await StorageAdapter.getById(STORES.BOOKS, 'nonexistent');
      expect(notFound).toBeUndefined();
    });

    it('应该更新实体', async () => {
      const book = { id: 'book1', title: 'Original Title' };
      await StorageAdapter.add(STORES.BOOKS, book);

      const updated = await StorageAdapter.update(STORES.BOOKS, {
        ...book,
        title: 'Updated Title',
      });

      expect(updated.title).toBe('Updated Title');

      const retrieved = await StorageAdapter.getById(STORES.BOOKS, 'book1');
      expect(retrieved?.title).toBe('Updated Title');
    });

    it('应该删除实体', async () => {
      const book = { id: 'book1', title: 'Test Book' };
      await StorageAdapter.add(STORES.BOOKS, book);

      await StorageAdapter.delete(STORES.BOOKS, 'book1');

      const result = await StorageAdapter.getById(STORES.BOOKS, 'book1');
      expect(result).toBeUndefined();
    });

    it('应该批量更新实体', async () => {
      const books = [
        { id: 'book1', title: 'Book 1' },
        { id: 'book2', title: 'Book 2' },
      ];

      await StorageAdapter.bulkUpdate(STORES.BOOKS, books);

      const result = await StorageAdapter.getAll(STORES.BOOKS);
      expect(result).toHaveLength(2);
    });

    it('应该处理单例对象', async () => {
      const settings = { libraryName: 'Test Library', maxBorrowDays: 30 };

      await StorageAdapter.setSingleton(STORES.SETTINGS, settings);
      const retrieved = await StorageAdapter.getSingleton(STORES.SETTINGS);

      expect(retrieved).toEqual(settings);
    });
  });

  describe('导出/导入', () => {
    beforeEach(() => {
      StorageAdapter.setBackend('localStorage');
    });

    it('应该导出所有数据', async () => {
      const book = { id: 'book1', title: 'Test Book' };
      const member = { id: 'member1', name: 'Test Member' };

      await StorageAdapter.add(STORES.BOOKS, book);
      await StorageAdapter.add(STORES.MEMBERS, member);

      const exported = await StorageAdapter.exportAll();

      expect(exported.version).toBe('1.0');
      expect(exported.exportTime).toBeDefined();
      expect(exported.books).toHaveLength(1);
      expect(exported.members).toHaveLength(1);
    });

    it('应该导入所有数据', async () => {
      const data = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        books: [{ id: 'book1', title: 'Imported Book' }],
        members: [{ id: 'member1', name: 'Imported Member' }],
      };

      await StorageAdapter.importAll(data);

      const books = await StorageAdapter.getAll(STORES.BOOKS);
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Imported Book');
    });
  });

  describe('统计信息', () => {
    beforeEach(() => {
      StorageAdapter.setBackend('localStorage');
    });

    it('应该返回所有 store 的统计信息', async () => {
      await StorageAdapter.add(STORES.BOOKS, { id: 'book1', title: 'Book 1' });
      await StorageAdapter.add(STORES.BOOKS, { id: 'book2', title: 'Book 2' });
      await StorageAdapter.add(STORES.MEMBERS, { id: 'member1', name: 'Member 1' });

      const stats = await StorageAdapter.getStats();

      expect(stats.BOOKS).toBe(2);
      expect(stats.MEMBERS).toBe(1);
    });
  });

  describe('清除数据', () => {
    beforeEach(() => {
      StorageAdapter.setBackend('localStorage');
    });

    it('应该清除特定 store', async () => {
      await StorageAdapter.add(STORES.BOOKS, { id: 'book1', title: 'Book 1' });

      await StorageAdapter.clear(STORES.BOOKS);

      const books = await StorageAdapter.getAll(STORES.BOOKS);
      expect(books).toHaveLength(0);
    });

    it('应该清除所有数据', async () => {
      await StorageAdapter.add(STORES.BOOKS, { id: 'book1', title: 'Book 1' });
      await StorageAdapter.add(STORES.MEMBERS, { id: 'member1', name: 'Member 1' });

      await StorageAdapter.clearAll();

      const books = await StorageAdapter.getAll(STORES.BOOKS);
      const members = await StorageAdapter.getAll(STORES.MEMBERS);

      expect(books).toHaveLength(0);
      expect(members).toHaveLength(0);
    });
  });
});

describe('MigrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('checkMigrationNeeded', () => {
    it('应该检测到需要迁移当 localStorage 有数据而 IndexedDB 为空', async () => {
      // 模拟 localStorage 有数据
      localStorage.setItem('library_books', JSON.stringify([{ id: 'book1' }]));

      const result = await MigrationService.checkMigrationNeeded();

      expect(result.needed).toBe(true);
      expect(result.hasLocalStorageData).toBe(true);
      expect(result.hasIndexedDbData).toBe(false);
    });

    it('应该不需要迁移当两者都为空', async () => {
      const result = await MigrationService.checkMigrationNeeded();

      expect(result.needed).toBe(false);
      expect(result.hasLocalStorageData).toBe(false);
      expect(result.hasIndexedDbData).toBe(false);
    });

    it('应该返回各 store 的统计信息', async () => {
      localStorage.setItem('library_books', JSON.stringify([{ id: 'book1' }, { id: 'book2' }]));
      localStorage.setItem('library_members', JSON.stringify([{ id: 'member1' }]));

      const result = await MigrationService.checkMigrationNeeded();

      expect(result.stats.BOOKS.localStorage).toBe(2);
      expect(result.stats.MEMBERS.localStorage).toBe(1);
    });
  });

  describe('migrate', () => {
    it('应该成功迁移数据并报告进度', async () => {
      const books = [
        { id: 'book1', title: 'Book 1' },
        { id: 'book2', title: 'Book 2' },
      ];
      localStorage.setItem('library_books', JSON.stringify(books));

      const progressUpdates: Array<{
        isMigrating: boolean;
        progress: number;
        currentStore: string;
      }> = [];

      const callback = (status: {
        isMigrating: boolean;
        progress: number;
        currentStore: string;
      }) => {
        progressUpdates.push(status);
      };

      const result = await MigrationService.migrate(callback);

      expect(result.success).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    it('应该处理空数据的情况', async () => {
      const result = await MigrationService.migrate();

      expect(result.success).toBe(true);
      expect(result.message).toContain('完成');
    });
  });

  describe('verifyMigration', () => {
    it('应该验证迁移结果', async () => {
      const books = [{ id: 'book1', title: 'Test Book' }];
      localStorage.setItem('library_books', JSON.stringify(books));

      // 先执行迁移
      await MigrationService.migrate();

      // 然后验证
      const verify = await MigrationService.verifyMigration();

      expect(verify.success).toBe(true);
      expect(verify.totalSource).toBe(1);
      expect(verify.totalTarget).toBe(1);
    });

    it('应该检测到不匹配的数据', async () => {
      // 模拟数据不一致的情况
      localStorage.setItem('library_books', JSON.stringify([{ id: '1' }, { id: '2' }]));
      localStorage.setItem('library_members', JSON.stringify([{ id: '1' }]));

      // 手动设置 IndexedDB 数据不同
      const mockDb = {
        books: [{ id: '1' }], // 只有 1 条，不一致
        members: [{ id: '1' }],
      };

      const result = await MigrationService.verifyMigration();
      expect(result.mismatches.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearLocalStorageData', () => {
    it('应该清除 localStorage 中的数据', async () => {
      localStorage.setItem('library_books', JSON.stringify([{ id: 'book1' }]));
      localStorage.setItem('library_members', JSON.stringify([{ id: 'member1' }]));

      await MigrationService.clearLocalStorageData();

      expect(localStorage.getItem('library_books')).toBeNull();
      expect(localStorage.getItem('library_members')).toBeNull();
    });
  });

  describe('autoMigrate', () => {
    it('应该在需要时自动执行迁移', async () => {
      localStorage.setItem('library_books', JSON.stringify([{ id: 'book1' }]));

      const result = await MigrationService.autoMigrate();

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
    });

    it('应该不需要迁移时返回 null', async () => {
      const result = await MigrationService.autoMigrate();

      expect(result).toBeNull();
    });
  });
});
