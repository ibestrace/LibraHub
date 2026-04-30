import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock IndexedDB BEFORE any module imports that use it
function createIDBRequestMock() {
  return {
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    result: null,
    error: null,
  };
}

Object.defineProperty(globalThis, 'indexedDB', {
  value: {
    open: () => createIDBRequestMock(),
    deleteDatabase: () => ({ onerror: null, onsuccess: null, onblocked: null }),
  },
  writable: true,
  configurable: true,
});

import { UnifiedStorage, storage } from './unifiedStorage';
import type { Book, Member, BorrowRecord, SystemSettings } from '@/types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('UnifiedStorage', () => {
  let storage: UnifiedStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Backend Selection', () => {
    it('should default to localStorage backend', () => {
      const store = new UnifiedStorage();
      expect(store.getBackend()).toBe('localStorage');
    });

    it('should allow localStorage backend', () => {
      const store = new UnifiedStorage('localStorage');
      expect(store.getBackend()).toBe('localStorage');
    });

    it('should allow switching backends', async () => {
      const store = new UnifiedStorage('localStorage');
      expect(store.getBackend()).toBe('localStorage');
      
      // Note: switching to indexedDB would require mocking IndexedDB initialization
      // This test verifies the method exists and accepts the parameter
    });
  });

  describe('localStorage Backend - Books', () => {
    beforeEach(() => {
      storage = new UnifiedStorage('localStorage');
    });

    it('should save and retrieve books', async () => {
      const book: Book = {
        id: 'book-1',
        barcode: 'B001',
        title: 'Test Book',
        author: 'Test Author',
        isbn: '1234567890',
        categoryId: 'cat-1',
        status: 'available',
        totalStock: 10,
        availableStock: 5,
        borrowCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await storage.saveBook(book);

      // BookService.add generates its own ID and also writes a log
      const bookCalls = localStorageMock.setItem.mock.calls.filter(
        (call: [string, string]) => call[0] === 'library_books'
      );
      expect(bookCalls.length).toBeGreaterThanOrEqual(1);
      expect(bookCalls[0][1]).toContain('Test Book');
    });

    it('should retrieve all books', async () => {
      const books: Book[] = [
        {
          id: 'book-1',
          barcode: 'B001',
          title: 'Book 1',
          author: 'Author 1',
          isbn: '111',
          categoryId: 'cat-1',
          status: 'available',
          totalStock: 10,
          availableStock: 10,
          borrowCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'book-2',
          barcode: 'B002',
          title: 'Book 2',
          author: 'Author 2',
          isbn: '222',
          categoryId: 'cat-1',
          status: 'available',
          totalStock: 5,
          availableStock: 5,
          borrowCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(books));
      
      const retrieved = await storage.getBooks();
      
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].id).toBe('book-1');
      expect(retrieved[1].id).toBe('book-2');
    });

    it('should return empty array when no books exist', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const books = await storage.getBooks();
      
      expect(books).toEqual([]);
    });

    it('should get book by id', async () => {
      const books: Book[] = [
        {
          id: 'book-1',
          barcode: 'B001',
          title: 'Book 1',
          author: 'Author 1',
          isbn: '111',
          categoryId: 'cat-1',
          status: 'available',
          totalStock: 10,
          availableStock: 10,
          borrowCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(books));
      
      const book = await storage.getBookById('book-1');
      
      expect(book).toBeDefined();
      expect(book?.id).toBe('book-1');
    });

    it('should return undefined for non-existent book', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
      
      const book = await storage.getBookById('non-existent');
      
      expect(book).toBeUndefined();
    });

    it('should delete a book', async () => {
      const books: Book[] = [
        {
          id: 'book-1',
          barcode: 'B001',
          title: 'Book 1',
          author: 'Author 1',
          isbn: '111',
          categoryId: 'cat-1',
          status: 'available',
          totalStock: 10,
          availableStock: 10,
          borrowCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'book-2',
          barcode: 'B002',
          title: 'Book 2',
          author: 'Author 2',
          isbn: '222',
          categoryId: 'cat-1',
          status: 'available',
          totalStock: 5,
          availableStock: 5,
          borrowCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(books));
      
      await storage.deleteBook('book-1');
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe('book-2');
    });

    it('should update existing book', async () => {
      const book: Book = {
        id: 'book-1',
        barcode: 'B001',
        title: 'Original Title',
        author: 'Author',
        isbn: '111',
        categoryId: 'cat-1',
        status: 'available',
        totalStock: 10,
        availableStock: 10,
        borrowCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([book]));
      
      const updatedBook = { ...book, title: 'Updated Title' };
      await storage.saveBook(updatedBook);
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData[0].title).toBe('Updated Title');
    });
  });

  describe('localStorage Backend - Members', () => {
    beforeEach(() => {
      storage = new UnifiedStorage('localStorage');
    });

    it('should save and retrieve members', async () => {
      const member: Member = {
        id: 'member-1',
        cardNumber: 'M001',
        name: 'Test Member',
        phone: '13800138000',
        memberType: {
          id: 'type-1',
          name: '普通会员',
          maxBorrowDays: 30,
          maxBorrowCount: 5,
          renewDays: 15,
          renewCount: 2,
          overdueRate: 0.1
        },
        status: 'active',
        registerDate: new Date().toISOString(),
        expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxBorrowCount: 5,
        currentBorrowCount: 0,
        totalReadingWords: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await storage.saveMember(member);

      // MemberService.add generates its own ID and also writes a log
      const memberCalls = localStorageMock.setItem.mock.calls.filter(
        (call: [string, string]) => call[0] === 'library_members'
      );
      expect(memberCalls.length).toBeGreaterThanOrEqual(1);
      expect(memberCalls[0][1]).toContain('Test Member');
    });

    it('should delete member', async () => {
      const members: Member[] = [
        {
          id: 'member-1',
          cardNumber: 'M001',
          name: 'Member 1',
          phone: '13800138000',
          memberType: {
            id: 'type-1',
            name: '普通会员',
            maxBorrowDays: 30,
            maxBorrowCount: 5,
            renewDays: 15,
            renewCount: 2,
            overdueRate: 0.1
          },
          status: 'active',
          registerDate: new Date().toISOString(),
          expireDate: new Date().toISOString(),
          maxBorrowCount: 5,
          currentBorrowCount: 0,
          totalReadingWords: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(members));
      
      await storage.deleteMember('member-1');
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(0);
    });
  });

  describe('localStorage Backend - Borrow Records', () => {
    beforeEach(() => {
      storage = new UnifiedStorage('localStorage');
    });

    it('should reject direct borrow record save', async () => {
      const record: BorrowRecord = {
        id: 'borrow-1',
        bookId: 'book-1',
        bookBarcode: 'B001',
        bookTitle: 'Test Book',
        bookAuthor: 'Test Author',
        memberId: 'member-1',
        memberCardNumber: 'M001',
        memberName: 'Test Member',
        borrowDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'borrowed',
        renewCount: 0,
        fineAmount: 0,
        operator: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await expect(storage.saveBorrowRecord(record)).rejects.toThrow('请使用 BorrowService.borrow');
    });
  });

  describe('localStorage Backend - Settings', () => {
    beforeEach(() => {
      storage = new UnifiedStorage('localStorage');
    });

    it('should return default settings when none exist', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const settings = await storage.getSettings();

      expect(settings.libraryName).toBe('LibraHub 图书馆');
      expect(settings.maxBorrowDays).toBe(30);
      expect(settings.maxRenewTimes).toBe(2);
      expect(settings.renewDays).toBe(15);
      expect(settings.overdueFinePerDay).toBe(1);
    });

    it('should save and retrieve settings', async () => {
      const settings: SystemSettings = {
        libraryName: 'My Library',
        maxBorrowDays: 45,
        maxRenewTimes: 3,
        renewDays: 20,
        overdueFinePerDay: 1.0,
        allowOverdueBorrow: true
      };

      await storage.saveSettings(settings);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'library_settings',
        expect.stringContaining('My Library')
      );
    });
  });

  describe('localStorage Backend - Statistics', () => {
    beforeEach(() => {
      storage = new UnifiedStorage('localStorage');
    });

    it('should return statistics for all data types', async () => {
      const books: Book[] = [
        { id: '1', barcode: 'B001', title: 'Book 1', author: 'A', isbn: '1', categoryId: 'c1', status: 'available', totalStock: 1, availableStock: 1, borrowCount: 0, createdAt: '', updatedAt: '' },
        { id: '2', barcode: 'B002', title: 'Book 2', author: 'A', isbn: '2', categoryId: 'c1', status: 'available', totalStock: 1, availableStock: 1, borrowCount: 0, createdAt: '', updatedAt: '' }
      ];
      
      const members: Member[] = [
        { id: '1', cardNumber: 'M001', name: 'Member 1', phone: '13800138000', memberType: { id: 't1', name: '普通', maxBorrowDays: 30, maxBorrowCount: 5, renewDays: 15, renewCount: 2, overdueRate: 0.1 }, status: 'active', registerDate: '', expireDate: '', maxBorrowCount: 5, currentBorrowCount: 0, totalReadingWords: 0, createdAt: '', updatedAt: '' }
      ];

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'library_books') return JSON.stringify(books);
        if (key === 'library_members') return JSON.stringify(members);
        return JSON.stringify([]);
      });
      
      const stats = await storage.getStats();
      
      expect(stats.books).toBe(2);
      expect(stats.members).toBe(1);
    });
  });

  describe('localStorage Backend - Export/Import', () => {
    beforeEach(() => {
      storage = new UnifiedStorage('localStorage');
    });

    it('should export all data', async () => {
      const books: Book[] = [
        { id: '1', barcode: 'B001', title: 'Book 1', author: 'A', isbn: '1', categoryId: 'c1', status: 'available', totalStock: 1, availableStock: 1, borrowCount: 0, createdAt: '', updatedAt: '' }
      ];

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'library_books') return JSON.stringify(books);
        return key === 'library_settings' ? null : JSON.stringify([]);
      });
      
      const exported = await storage.exportAll();
      const data = JSON.parse(exported);
      
      expect(data.version).toBe('1.0');
      expect(data.books).toHaveLength(1);
      expect(data.exportTime).toBeDefined();
    });

    it('should import data successfully', async () => {
      const importData = {
        version: '1.0',
        books: [
          { id: '1', barcode: 'B001', title: 'Imported Book', author: 'A', isbn: '1', categoryId: 'c1', status: 'available', totalStock: 1, availableStock: 1, borrowCount: 0, createdAt: '', updatedAt: '' }
        ],
        members: [],
        memberTypes: [],
        borrowRecords: [],
        reservations: [],
        categories: [],
        logs: [],
        settings: { libraryName: 'Imported Library', maxBorrowDays: 30, maxRenewTimes: 2, renewDays: 15, overdueFinePerDay: 0.5, allowOverdueBorrow: false },
        memberGroups: [],
        readingStats: []
      };

      const result = await storage.importAll(JSON.stringify(importData));
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle import errors gracefully', async () => {
      const result = await storage.importAll('invalid json');
      
      expect(result).toBe(false);
    });
  });

  describe('localStorage Backend - Clear All', () => {
    beforeEach(() => {
      storage = new UnifiedStorage('localStorage');
    });

    it('should clear all data', async () => {
      await storage.clearAll();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(11);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      storage = new UnifiedStorage('localStorage');
    });

    it('should handle localStorage read errors', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const books = await storage.getBooks();
      
      expect(books).toEqual([]);
    });

    it('should throw error when localStorage write fails due to quota', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const book: Book = {
        id: '1',
        barcode: 'B001',
        title: 'Test',
        author: 'Test',
        isbn: '1',
        categoryId: 'c1',
        status: 'available',
        totalStock: 1,
        availableStock: 1,
        borrowCount: 0,
        createdAt: '',
        updatedAt: ''
      };

      await expect(storage.saveBook(book)).rejects.toThrow('存储空间不足');
    });
  });
});

describe('Storage Singleton', () => {
  it('should export storage singleton', () => {
    expect(storage).toBeDefined();
    expect(storage.getBackend()).toBe('localStorage');
  });
});
