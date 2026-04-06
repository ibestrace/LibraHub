import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  TransactionManager, 
  borrowBookWithTransaction, 
  returnBookWithTransaction, 
  renewBookWithTransaction,
  type TransactionOperation 
} from './transaction';
import { IndexedDbService, STORES } from './indexedDb';
import type { Book, Member, BorrowRecord } from '@/types';

// Mock IndexedDbService
vi.mock('./indexedDb', () => ({
  IndexedDbService: {
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getById: vi.fn()
  },
  STORES: {
    BOOKS: 'BOOKS',
    MEMBERS: 'MEMBERS',
    BORROW_RECORDS: 'BORROW_RECORDS'
  }
}));

describe('TransactionManager', () => {
  beforeEach(() => {
    // Reset singleton state
    (TransactionManager as any).currentTransaction = null;
    (TransactionManager as any).inTransaction = false;
    vi.clearAllMocks();
  });

  describe('Basic Transaction Operations', () => {
    it('should begin a new transaction', () => {
      expect(TransactionManager.checkInTransaction()).toBe(false);
      
      TransactionManager.beginTransaction();
      
      expect(TransactionManager.checkInTransaction()).toBe(true);
      expect(TransactionManager.getTransactionInfo()?.operationCount).toBe(0);
    });

    it('should throw error when beginning nested transaction', () => {
      TransactionManager.beginTransaction();
      
      expect(() => TransactionManager.beginTransaction()).toThrow('事务已存在，不支持嵌套事务');
    });

    it('should commit transaction successfully', async () => {
      TransactionManager.beginTransaction();
      
      await TransactionManager.commitTransaction();
      
      expect(TransactionManager.checkInTransaction()).toBe(false);
      expect(TransactionManager.getTransactionInfo()).toBeNull();
    });

    it('should throw error when committing without active transaction', async () => {
      await expect(TransactionManager.commitTransaction()).rejects.toThrow('没有活动的事务');
    });

    it('should rollback transaction successfully', async () => {
      TransactionManager.beginTransaction();
      
      await TransactionManager.rollbackTransaction();
      
      expect(TransactionManager.checkInTransaction()).toBe(false);
    });

    it('should throw error when rolling back without active transaction', async () => {
      await expect(TransactionManager.rollbackTransaction()).rejects.toThrow('没有活动的事务');
    });
  });

  describe('Transaction Operations Management', () => {
    it('should add operation to current transaction', () => {
      TransactionManager.beginTransaction();
      
      const operation: TransactionOperation = { type: 'ADD_BOOK', data: { id: '1' } as Book };
      const rollbackOp: TransactionOperation = { type: 'DELETE_BOOK', id: '1' };
      
      TransactionManager.addOperation(operation, rollbackOp);
      
      expect(TransactionManager.getTransactionInfo()?.operationCount).toBe(1);
    });

    it('should throw error when adding operation without active transaction', () => {
      const operation: TransactionOperation = { type: 'ADD_BOOK', data: { id: '1' } as Book };
      const rollbackOp: TransactionOperation = { type: 'DELETE_BOOK', id: '1' };
      
      expect(() => TransactionManager.addOperation(operation, rollbackOp))
        .toThrow('没有活动的事务，请先调用 beginTransaction()');
    });

    it('should track multiple operations', () => {
      TransactionManager.beginTransaction();
      
      TransactionManager.addOperation(
        { type: 'ADD_BOOK', data: { id: '1' } as Book },
        { type: 'DELETE_BOOK', id: '1' }
      );
      TransactionManager.addOperation(
        { type: 'ADD_MEMBER', data: { id: '2' } as Member },
        { type: 'DELETE_MEMBER', id: '2' }
      );
      TransactionManager.addOperation(
        { type: 'ADD_BORROW_RECORD', data: { id: '3' } as BorrowRecord },
        { type: 'DELETE_BORROW_RECORD', id: '3' }
      );
      
      expect(TransactionManager.getTransactionInfo()?.operationCount).toBe(3);
    });
  });

  describe('Rollback Operations', () => {
    it('should execute rollback operations in reverse order', async () => {
      // Setup mock implementations
      let callOrder: string[] = [];
      vi.mocked(IndexedDbService.delete).mockImplementation(async () => {
        callOrder.push('delete');
      });
      vi.mocked(IndexedDbService.update).mockImplementation(async () => {
        callOrder.push('update');
      });
      vi.mocked(IndexedDbService.getById).mockResolvedValue(undefined);

      TransactionManager.beginTransaction();
      
      // Add operations in order: ADD, UPDATE, DELETE
      TransactionManager.addOperation(
        { type: 'ADD_BOOK', data: { id: '1' } as Book },
        { type: 'DELETE_BOOK', id: '1' }
      );
      TransactionManager.addOperation(
        { type: 'UPDATE_BOOK', id: '2', updates: { title: 'New' } },
        { type: 'UPDATE_BOOK', id: '2', updates: { title: 'Old' } }
      );
      TransactionManager.addOperation(
        { type: 'DELETE_BOOK', id: '3' },
        { type: 'ADD_BOOK', data: { id: '3' } as Book }
      );
      
      await TransactionManager.rollbackTransaction();
      
      // Rollback should execute in reverse order: ADD (for id:3), UPDATE (for id:2), DELETE (for id:1)
      expect(callOrder).toHaveLength(3);
    });

    it('should continue rollback even if individual operation fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(IndexedDbService.delete)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(undefined);
      
      TransactionManager.beginTransaction();
      TransactionManager.addOperation(
        { type: 'ADD_BOOK', data: { id: '1' } as Book },
        { type: 'DELETE_BOOK', id: '1' }
      );
      TransactionManager.addOperation(
        { type: 'ADD_BOOK', data: { id: '2' } as Book },
        { type: 'DELETE_BOOK', id: '2' }
      );
      
      await TransactionManager.rollbackTransaction();
      
      // Should have logged error but completed rollback
      expect(consoleSpy).toHaveBeenCalled();
      expect(TransactionManager.checkInTransaction()).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });
});

describe('Borrow/Return/Renew Transactions', () => {
  const mockBook: Book = {
    id: 'book-1',
    barcode: 'B001',
    title: 'Test Book',
    author: 'Test Author',
    isbn: '1234567890',
    availableStock: 5,
    totalStock: 10,
    borrowCount: 0,
    status: 'available',
    categoryId: 'cat-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockMember: Member = {
    id: 'member-1',
    cardNumber: 'M001',
    name: 'Test Member',
    idCard: 'ID123456',
    phone: '13800138000',
    email: 'test@example.com',
    address: 'Test Address',
    memberType: {
      id: 'type-1',
      name: '普通会员',
      maxBorrowDays: 30,
      maxBorrowCount: 5,
      renewDays: 15,
      renewCount: 2,
      overdueRate: 0.1
    },
    currentBorrowCount: 2,
    totalReadingWords: 10000,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockBorrowRecord: BorrowRecord = {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(IndexedDbService.add).mockResolvedValue({} as any);
    vi.mocked(IndexedDbService.update).mockResolvedValue({} as any);
    vi.mocked(IndexedDbService.getById).mockResolvedValue(undefined);
  });

  describe('borrowBookWithTransaction', () => {
    it('should successfully borrow a book with transaction', async () => {
      const record = await borrowBookWithTransaction(mockBook, mockMember, 'admin', 'Test notes');
      
      expect(record).toBeDefined();
      expect(record.bookId).toBe(mockBook.id);
      expect(record.memberId).toBe(mockMember.id);
      expect(record.status).toBe('borrowed');
      
      // Verify all three operations were called
      expect(IndexedDbService.add).toHaveBeenCalledWith(STORES.BORROW_RECORDS, expect.any(Object));
      expect(IndexedDbService.update).toHaveBeenCalledWith(STORES.BOOKS, expect.any(Object));
      expect(IndexedDbService.update).toHaveBeenCalledWith(STORES.MEMBERS, expect.any(Object));
    });

    it('should update book stock correctly', async () => {
      await borrowBookWithTransaction(mockBook, mockMember, 'admin');
      
      const bookUpdateCall = vi.mocked(IndexedDbService.update).mock.calls
        .find(call => call[0] === STORES.BOOKS);
      
      expect(bookUpdateCall).toBeDefined();
      expect(bookUpdateCall![1]).toMatchObject({
        availableStock: 4, // 5 - 1
        borrowCount: 1
      });
    });

    it('should update member borrow count', async () => {
      await borrowBookWithTransaction(mockBook, mockMember, 'admin');
      
      const memberUpdateCall = vi.mocked(IndexedDbService.update).mock.calls
        .find(call => call[0] === STORES.MEMBERS);
      
      expect(memberUpdateCall).toBeDefined();
      expect(memberUpdateCall![1]).toMatchObject({
        currentBorrowCount: 3 // 2 + 1
      });
    });

    it('should rollback on failure', async () => {
      vi.mocked(IndexedDbService.update).mockRejectedValueOnce(new Error('Update failed'));
      
      await expect(borrowBookWithTransaction(mockBook, mockMember, 'admin'))
        .rejects.toThrow('Update failed');
    });

    it('should mark book as borrowed when stock reaches zero', async () => {
      const bookWithOneStock = { ...mockBook, availableStock: 1 };
      
      await borrowBookWithTransaction(bookWithOneStock, mockMember, 'admin');
      
      const bookUpdateCall = vi.mocked(IndexedDbService.update).mock.calls
        .find(call => call[0] === STORES.BOOKS);
      
      expect(bookUpdateCall![1]).toMatchObject({
        availableStock: 0,
        status: 'borrowed'
      });
    });
  });

  describe('returnBookWithTransaction', () => {
    it('should successfully return a book with transaction', async () => {
      const record = await returnBookWithTransaction(
        mockBorrowRecord, 
        mockBook, 
        mockMember, 
        'admin',
        0,
        undefined
      );
      
      expect(record.status).toBe('returned');
      expect(record.returnDate).toBeDefined();
      
      // Verify all three operations
      expect(IndexedDbService.update).toHaveBeenCalledTimes(3);
    });

    it('should update book stock on return', async () => {
      await returnBookWithTransaction(mockBorrowRecord, mockBook, mockMember, 'admin');
      
      const bookUpdateCall = vi.mocked(IndexedDbService.update).mock.calls
        .find(call => call[0] === STORES.BOOKS);
      
      expect(bookUpdateCall![1]).toMatchObject({
        availableStock: 6 // 5 + 1
      });
    });

    it('should update member reading stats on return', async () => {
      const bookWithWordCount = { ...mockBook, wordCount: 50000 };
      
      await returnBookWithTransaction(mockBorrowRecord, bookWithWordCount, mockMember, 'admin');
      
      const memberUpdateCall = vi.mocked(IndexedDbService.update).mock.calls
        .find(call => call[0] === STORES.MEMBERS);
      
      expect(memberUpdateCall![1]).toMatchObject({
        currentBorrowCount: 1, // 2 - 1
        totalReadingWords: 60000 // 10000 + 50000
      });
    });

    it('should handle fine amount', async () => {
      const record = await returnBookWithTransaction(
        mockBorrowRecord, 
        mockBook, 
        mockMember, 
        'admin',
        10.5,
        '逾期罚款'
      );
      
      expect(record.fineAmount).toBe(10.5);
      expect(record.fineReason).toBe('逾期罚款');
    });

    it('should not allow negative borrow count', async () => {
      const memberWithZeroBorrow = { ...mockMember, currentBorrowCount: 0 };
      
      await returnBookWithTransaction(mockBorrowRecord, mockBook, memberWithZeroBorrow, 'admin');
      
      const memberUpdateCall = vi.mocked(IndexedDbService.update).mock.calls
        .find(call => call[0] === STORES.MEMBERS);
      
      expect(memberUpdateCall![1].currentBorrowCount).toBe(0);
    });
  });

  describe('renewBookWithTransaction', () => {
    it('should successfully renew a book', async () => {
      const record = await renewBookWithTransaction(mockBorrowRecord, mockMember);
      
      expect(record.status).toBe('renewed');
      expect(record.renewCount).toBe(1);
      
      // Due date should be extended
      const newDueDate = new Date(record.dueDate);
      const originalDueDate = new Date(mockBorrowRecord.dueDate);
      const daysExtended = (newDueDate.getTime() - originalDueDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysExtended).toBe(mockMember.memberType.renewDays);
    });

    it('should update borrow record status to renewed', async () => {
      const record = await renewBookWithTransaction(mockBorrowRecord, mockMember);
      
      const recordUpdateCall = vi.mocked(IndexedDbService.update).mock.calls
        .find(call => call[0] === STORES.BORROW_RECORDS);
      
      expect(recordUpdateCall![1]).toMatchObject({
        status: 'renewed',
        renewCount: 1
      });
    });

    it('should rollback on failure', async () => {
      vi.mocked(IndexedDbService.update).mockRejectedValueOnce(new Error('Update failed'));
      
      await expect(renewBookWithTransaction(mockBorrowRecord, mockMember))
        .rejects.toThrow('Update failed');
    });
  });
});
