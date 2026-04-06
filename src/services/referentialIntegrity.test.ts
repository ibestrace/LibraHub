import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReferentialIntegrityService,
  IntegrityViolationError,
  REFERENTIAL_CONSTRAINTS,
  safeDeleteBook,
  safeDeleteMember,
  safeDeleteCategory,
  type DeleteOperationResult
} from './referentialIntegrity';
import { storage } from './unifiedStorage';
import type { Book, Member, BorrowRecord, BookCategory, MemberType, MemberGroup } from '@/types';

// Mock storage
vi.mock('./unifiedStorage', () => ({
  storage: {
    getBooks: vi.fn(),
    getBookById: vi.fn(),
    deleteBook: vi.fn(),
    getMembers: vi.fn(),
    getMemberById: vi.fn(),
    deleteMember: vi.fn(),
    getBorrowRecords: vi.fn(),
    deleteBorrowRecord: vi.fn(),
    getCategories: vi.fn(),
    deleteCategory: vi.fn(),
    getMemberTypes: vi.fn(),
    deleteMemberType: vi.fn(),
    getMemberGroups: vi.fn(),
    deleteMemberGroup: vi.fn(),
    saveMember: vi.fn(),
    saveBook: vi.fn()
  }
}));

describe('ReferentialIntegrityService', () => {
  let service: ReferentialIntegrityService;

  beforeEach(() => {
    service = new ReferentialIntegrityService(REFERENTIAL_CONSTRAINTS);
    vi.clearAllMocks();
  });

  describe('Constraint Management', () => {
    it('should return constraints for parent entity', () => {
      const bookConstraints = service.getConstraintsForParent('books');
      expect(bookConstraints.length).toBeGreaterThan(0);
      expect(bookConstraints.some(c => c.name === 'FK_BORROW_BOOK')).toBe(true);
    });

    it('should return constraints for child entity', () => {
      const memberConstraints = service.getConstraintsForChild('members');
      expect(memberConstraints.length).toBeGreaterThan(0);
    });

    it('should return empty array for entity with no constraints', () => {
      const constraints = service.getConstraintsForParent('reservations' as any);
      expect(constraints).toEqual([]);
    });
  });

  describe('Delete Integrity Check - RESTRICT', () => {
    it('should detect violations when book has borrow records', async () => {
      const book: Book = {
        id: 'book-1',
        barcode: 'B001',
        title: 'Test Book',
        author: 'Author',
        isbn: '123',
        categoryId: 'cat-1',
        status: 'available',
        totalStock: 10,
        availableStock: 10,
        borrowCount: 0,
        createdAt: '',
        updatedAt: ''
      };

      const borrowRecord: BorrowRecord = {
        id: 'borrow-1',
        bookId: 'book-1',
        bookBarcode: 'B001',
        bookTitle: 'Test Book',
        bookAuthor: 'Author',
        memberId: 'member-1',
        memberCardNumber: 'M001',
        memberName: 'Test Member',
        borrowDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        status: 'borrowed',
        renewCount: 0,
        fineAmount: 0,
        operator: 'admin',
        createdAt: '',
        updatedAt: ''
      };

      vi.mocked(storage.getBorrowRecords).mockResolvedValue([borrowRecord]);

      const violations = await service.checkDeleteIntegrity('books', 'book-1');

      expect(violations.length).toBe(1);
      expect(violations[0].constraint.name).toBe('FK_BORROW_BOOK');
      expect(violations[0].children.length).toBe(1);
      expect(violations[0].children[0].id).toBe('borrow-1');
    });

    it('should detect violations when category has books', async () => {
      const book: Book = {
        id: 'book-1',
        barcode: 'B001',
        title: 'Test Book',
        author: 'Author',
        isbn: '123',
        categoryId: 'cat-1',
        status: 'available',
        totalStock: 10,
        availableStock: 10,
        borrowCount: 0,
        createdAt: '',
        updatedAt: ''
      };

      vi.mocked(storage.getBooks).mockResolvedValue([book]);

      const violations = await service.checkDeleteIntegrity('categories', 'cat-1');

      expect(violations.length).toBe(1);
      expect(violations[0].constraint.name).toBe('FK_BOOK_CATEGORY');
    });

    it('should return empty array when no violations exist', async () => {
      vi.mocked(storage.getBorrowRecords).mockResolvedValue([]);

      const violations = await service.checkDeleteIntegrity('books', 'book-1');

      expect(violations).toEqual([]);
    });
  });

  describe('Safe Delete - RESTRICT', () => {
    it('should prevent deletion when violations exist', async () => {
      const borrowRecord: BorrowRecord = {
        id: 'borrow-1',
        bookId: 'book-1',
        bookBarcode: 'B001',
        bookTitle: 'Test Book',
        bookAuthor: 'Author',
        memberId: 'member-1',
        memberCardNumber: 'M001',
        memberName: 'Test Member',
        borrowDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        status: 'borrowed',
        renewCount: 0,
        fineAmount: 0,
        operator: 'admin',
        createdAt: '',
        updatedAt: ''
      };

      vi.mocked(storage.getBorrowRecords).mockResolvedValue([borrowRecord]);

      const result = await service.safeDelete('books', 'book-1');

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(IntegrityViolationError);
      expect(result.error?.constraint.name).toBe('FK_BORROW_BOOK');
      expect(storage.deleteBook).not.toHaveBeenCalled();
    });

    it('should allow deletion when no violations exist', async () => {
      vi.mocked(storage.getBorrowRecords).mockResolvedValue([]);
      vi.mocked(storage.getBooks).mockResolvedValue([]);
      vi.mocked(storage.getMembers).mockResolvedValue([]);

      const result = await service.safeDelete('books', 'book-1');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(storage.deleteBook).toHaveBeenCalledWith('book-1');
    });
  });

  describe('Safe Delete - SET_NULL', () => {
    it('should set groupId to null when deleting member group', async () => {
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
        expireDate: new Date().toISOString(),
        maxBorrowCount: 5,
        currentBorrowCount: 0,
        totalReadingWords: 0,
        groupId: 'group-1',
        createdAt: '',
        updatedAt: ''
      };

      vi.mocked(storage.getMembers).mockResolvedValue([member]);
      vi.mocked(storage.saveMember).mockResolvedValue({ ...member, groupId: undefined });

      const result = await service.safeDelete('member_groups', 'group-1');

      expect(result.success).toBe(true);
      expect(result.setNullResults.length).toBe(1);
      expect(result.setNullResults[0].count).toBe(1);
      expect(storage.saveMember).toHaveBeenCalledWith(expect.objectContaining({
        groupId: undefined
      }));
    });
  });

  describe('Foreign Key Validation', () => {
    it('should validate valid foreign key', async () => {
      const category: BookCategory = {
        id: 'cat-1',
        name: 'Test Category',
        createdAt: new Date().toISOString()
      };

      vi.mocked(storage.getCategories).mockResolvedValue([category]);

      const result = await service.validateForeignKey('books', 'categoryId', 'cat-1');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should invalidate non-existent foreign key', async () => {
      vi.mocked(storage.getCategories).mockResolvedValue([]);

      const result = await service.validateForeignKey('books', 'categoryId', 'non-existent');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('不存在');
    });

    it('should allow null/undefined values', async () => {
      const result = await service.validateForeignKey('books', 'categoryId', undefined);

      expect(result.valid).toBe(true);
    });
  });

  describe('Integrity Report', () => {
    it('should generate integrity report', async () => {
      const book: Book = {
        id: 'book-1',
        barcode: 'B001',
        title: 'Test Book',
        author: 'Author',
        isbn: '123',
        categoryId: 'deleted-category', // 引用了不存在的分类
        status: 'available',
        totalStock: 10,
        availableStock: 10,
        borrowCount: 0,
        createdAt: '',
        updatedAt: ''
      };

      vi.mocked(storage.getBooks).mockResolvedValue([book]);
      vi.mocked(storage.getCategories).mockResolvedValue([]);
      vi.mocked(storage.getMembers).mockResolvedValue([]);
      vi.mocked(storage.getBorrowRecords).mockResolvedValue([]);

      const report = await service.generateIntegrityReport();

      expect(report.totalConstraints).toBeGreaterThan(0);
      expect(report.violations.length).toBeGreaterThan(0);
      expect(report.violations[0].orphanedCount).toBeGreaterThan(0);
    });

    it('should return no violations when data is clean', async () => {
      vi.mocked(storage.getBooks).mockResolvedValue([]);
      vi.mocked(storage.getMembers).mockResolvedValue([]);
      vi.mocked(storage.getBorrowRecords).mockResolvedValue([]);

      const report = await service.generateIntegrityReport();

      expect(report.violations.length).toBe(0);
    });
  });

  describe('Integrity Repair', () => {
    it('should delete orphan records', async () => {
      const book: Book = {
        id: 'book-1',
        barcode: 'B001',
        title: 'Test Book',
        author: 'Author',
        isbn: '123',
        categoryId: 'deleted-category',
        status: 'available',
        totalStock: 10,
        availableStock: 10,
        borrowCount: 0,
        createdAt: '',
        updatedAt: ''
      };

      vi.mocked(storage.getBooks).mockResolvedValue([book]);
      vi.mocked(storage.deleteBook).mockResolvedValue(undefined);

      const constraint = REFERENTIAL_CONSTRAINTS.find(c => c.name === 'FK_BOOK_CATEGORY')!;
      const result = await service.repairIntegrity(constraint, 'DELETE_ORPHAN');

      expect(result.repaired).toBe(1);
      expect(storage.deleteBook).toHaveBeenCalledWith('book-1');
    });
  });

  describe('Convenience Functions', () => {
    it('safeDeleteBook should use integrity service', async () => {
      vi.mocked(storage.getBorrowRecords).mockResolvedValue([]);
      vi.mocked(storage.getBooks).mockResolvedValue([]);
      vi.mocked(storage.getMembers).mockResolvedValue([]);
      vi.mocked(storage.deleteBook).mockResolvedValue(undefined);

      const result = await safeDeleteBook('book-1');

      expect(result.success).toBe(true);
      expect(storage.deleteBook).toHaveBeenCalledWith('book-1');
    });

    it('safeDeleteMember should prevent deletion with borrow records', async () => {
      const borrowRecord: BorrowRecord = {
        id: 'borrow-1',
        bookId: 'book-1',
        bookBarcode: 'B001',
        bookTitle: 'Test Book',
        bookAuthor: 'Author',
        memberId: 'member-1',
        memberCardNumber: 'M001',
        memberName: 'Test Member',
        borrowDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        status: 'borrowed',
        renewCount: 0,
        fineAmount: 0,
        operator: 'admin',
        createdAt: '',
        updatedAt: ''
      };

      vi.mocked(storage.getBorrowRecords).mockResolvedValue([borrowRecord]);

      const result = await safeDeleteMember('member-1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('safeDeleteCategory should prevent deletion with books', async () => {
      const book: Book = {
        id: 'book-1',
        barcode: 'B001',
        title: 'Test Book',
        author: 'Author',
        isbn: '123',
        categoryId: 'cat-1',
        status: 'available',
        totalStock: 10,
        availableStock: 10,
        borrowCount: 0,
        createdAt: '',
        updatedAt: ''
      };

      vi.mocked(storage.getBooks).mockResolvedValue([book]);

      const result = await safeDeleteCategory('cat-1');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('该分类下存在书籍');
    });
  });
});
