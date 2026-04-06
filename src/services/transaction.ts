// 事务管理服务 - 使用 IndexedDB 事务支持原子操作
// 确保借阅/归还等多步骤操作的原子性

import { IndexedDbService, STORES } from './indexedDb';
import type { Book, Member, BorrowRecord, BookStatus, BorrowStatus } from '@/types';
import { generateBorrowRecordId } from '@/utils/idGenerator';

/**
 * 事务操作类型
 */
export type TransactionOperation = 
  | { type: 'ADD_BOOK'; data: Book }
  | { type: 'UPDATE_BOOK'; id: string; updates: Partial<Book> }
  | { type: 'DELETE_BOOK'; id: string }
  | { type: 'ADD_MEMBER'; data: Member }
  | { type: 'UPDATE_MEMBER'; id: string; updates: Partial<Member> }
  | { type: 'DELETE_MEMBER'; id: string }
  | { type: 'ADD_BORROW_RECORD'; data: BorrowRecord }
  | { type: 'UPDATE_BORROW_RECORD'; id: string; updates: Partial<BorrowRecord> }
  | { type: 'DELETE_BORROW_RECORD'; id: string };

/**
 * 事务上下文
 */
interface TransactionContext {
  operations: TransactionOperation[];
  rollbackOperations: TransactionOperation[];
}

/**
 * 事务管理器
 * 使用补偿事务模式实现原子性
 */
export class TransactionManager {
  private static currentTransaction: TransactionContext | null = null;
  private static inTransaction = false;

  /**
   * 开始事务
   */
  static beginTransaction(): void {
    if (this.inTransaction) {
      throw new Error('事务已存在，不支持嵌套事务');
    }
    
    this.currentTransaction = {
      operations: [],
      rollbackOperations: []
    };
    this.inTransaction = true;
  }

  /**
   * 提交事务
   */
  static async commitTransaction(): Promise<void> {
    if (!this.inTransaction || !this.currentTransaction) {
      throw new Error('没有活动的事务');
    }

    try {
      // 所有操作已在执行时完成，只需清理状态
      this.currentTransaction = null;
      this.inTransaction = false;
    } catch (error) {
      console.error('事务提交失败:', error);
      throw error;
    }
  }

  /**
   * 回滚事务
   */
  static async rollbackTransaction(): Promise<void> {
    if (!this.inTransaction || !this.currentTransaction) {
      throw new Error('没有活动的事务');
    }

    console.log('开始回滚事务，执行补偿操作...');
    
    // 按相反顺序执行回滚操作
    const rollbackOps = [...this.currentTransaction.rollbackOperations].reverse();
    
    for (const operation of rollbackOps) {
      try {
        await this.executeOperation(operation);
        console.log(`回滚操作成功: ${operation.type}`);
      } catch (error) {
        console.error(`回滚操作失败: ${operation.type}`, error);
        // 继续尝试其他回滚操作
      }
    }

    this.currentTransaction = null;
    this.inTransaction = false;
    console.log('事务回滚完成');
  }

  /**
   * 添加操作到当前事务
   */
  static addOperation(operation: TransactionOperation, rollbackOperation: TransactionOperation): void {
    if (!this.inTransaction || !this.currentTransaction) {
      throw new Error('没有活动的事务，请先调用 beginTransaction()');
    }

    this.currentTransaction.operations.push(operation);
    this.currentTransaction.rollbackOperations.push(rollbackOperation);
  }

  /**
   * 执行单个操作
   */
  private static async executeOperation(operation: TransactionOperation): Promise<void> {
    switch (operation.type) {
      case 'ADD_BOOK':
        await IndexedDbService.add(STORES.BOOKS, operation.data);
        break;
      case 'UPDATE_BOOK': {
        // 需要获取完整对象
        const bookToUpdate = await IndexedDbService.getById<Book>(STORES.BOOKS, operation.id);
        if (bookToUpdate) {
          await IndexedDbService.update(STORES.BOOKS, { ...bookToUpdate, ...operation.updates });
        }
        break;
      }
      case 'DELETE_BOOK':
        await IndexedDbService.delete(STORES.BOOKS, operation.id);
        break;
      case 'ADD_MEMBER':
        await IndexedDbService.add(STORES.MEMBERS, operation.data);
        break;
      case 'UPDATE_MEMBER': {
        const memberToUpdate = await IndexedDbService.getById<Member>(STORES.MEMBERS, operation.id);
        if (memberToUpdate) {
          await IndexedDbService.update(STORES.MEMBERS, { ...memberToUpdate, ...operation.updates });
        }
        break;
      }
      case 'DELETE_MEMBER':
        await IndexedDbService.delete(STORES.MEMBERS, operation.id);
        break;
      case 'ADD_BORROW_RECORD':
        await IndexedDbService.add(STORES.BORROW_RECORDS, operation.data);
        break;
      case 'UPDATE_BORROW_RECORD': {
        const recordToUpdate = await IndexedDbService.getById<BorrowRecord>(STORES.BORROW_RECORDS, operation.id);
        if (recordToUpdate) {
          await IndexedDbService.update(STORES.BORROW_RECORDS, { ...recordToUpdate, ...operation.updates });
        }
        break;
      }
      case 'DELETE_BORROW_RECORD':
        await IndexedDbService.delete(STORES.BORROW_RECORDS, operation.id);
        break;
      default:
        throw new Error(`未知操作类型`);
    }
  }

  /**
   * 检查是否在事务中
   */
  static checkInTransaction(): boolean {
    return this.inTransaction;
  }

  /**
   * 获取当前事务信息
   */
  static getTransactionInfo(): { operationCount: number } | null {
    if (!this.currentTransaction) return null;
    return {
      operationCount: this.currentTransaction.operations.length
    };
  }
}

// ==================== 借阅/归还事务包装器 ====================

/**
 * 执行带事务的借书操作
 * @param book 书籍
 * @param member 会员
 * @param operator 操作员
 * @param notes 备注
 * @returns 借阅记录
 */
export async function borrowBookWithTransaction(
  book: Book,
  member: Member,
  operator: string,
  notes?: string
): Promise<BorrowRecord> {
  const transactionManager = TransactionManager;
  
  try {
    transactionManager.beginTransaction();

    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + member.memberType.maxBorrowDays);

    // 创建借阅记录
    const record: BorrowRecord = {
      id: generateBorrowRecordId(),
      bookId: book.id,
      bookBarcode: book.barcode,
      bookTitle: book.title,
      bookAuthor: book.author,
      memberId: member.id,
      memberCardNumber: member.cardNumber,
      memberName: member.name,
      borrowDate: now.toISOString(),
      dueDate: dueDate.toISOString(),
      status: 'borrowed' as BorrowStatus,
      renewCount: 0,
      fineAmount: 0,
      notes,
      operator,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    // 添加借阅记录
    transactionManager.addOperation(
      { type: 'ADD_BORROW_RECORD', data: record },
      { type: 'DELETE_BORROW_RECORD', id: record.id }
    );

    // 更新书籍状态
    const newBookAvailableStock = book.availableStock - 1;
    const updatedBook: Partial<Book> = {
      availableStock: newBookAvailableStock,
      status: newBookAvailableStock === 0 ? 'borrowed' as BookStatus : book.status,
      borrowCount: book.borrowCount + 1
    };
    
    transactionManager.addOperation(
      { type: 'UPDATE_BOOK', id: book.id, updates: updatedBook },
      { type: 'UPDATE_BOOK', id: book.id, updates: {} }
    );

    // 更新会员借阅计数
    const updatedMember: Partial<Member> = {
      currentBorrowCount: member.currentBorrowCount + 1
    };
    
    transactionManager.addOperation(
      { type: 'UPDATE_MEMBER', id: member.id, updates: updatedMember },
      { type: 'UPDATE_MEMBER', id: member.id, updates: {} }
    );

    // 执行所有操作
    await IndexedDbService.add(STORES.BORROW_RECORDS, record);
    await IndexedDbService.update(STORES.BOOKS, { ...book, ...updatedBook });
    await IndexedDbService.update(STORES.MEMBERS, { ...member, ...updatedMember });

    // 提交事务
    await transactionManager.commitTransaction();

    return record;
  } catch (error) {
    console.error('借书事务失败，执行回滚:', error);
    await transactionManager.rollbackTransaction();
    throw error;
  }
}

/**
 * 执行带事务的还书操作
 * @param record 借阅记录
 * @param book 书籍
 * @param member 会员
 * @param operator 操作员
 * @param fineAmount 罚款金额
 * @param fineReason 罚款原因
 * @returns 更新后的借阅记录
 */
export async function returnBookWithTransaction(
  record: BorrowRecord,
  book: Book,
  member: Member,
  operator: string,
  fineAmount: number = 0,
  fineReason?: string
): Promise<BorrowRecord> {
  const transactionManager = TransactionManager;
  
  try {
    transactionManager.beginTransaction();

    const now = new Date().toISOString();
    const wordCount = book.wordCount || 0;

    // 更新借阅记录
    const updatedRecord: Partial<BorrowRecord> = {
      returnDate: now,
      status: 'returned' as BorrowStatus,
      fineAmount,
      fineReason,
      returnOperator: operator,
      updatedAt: now
    };

    transactionManager.addOperation(
      { type: 'UPDATE_BORROW_RECORD', id: record.id, updates: updatedRecord },
      { type: 'UPDATE_BORROW_RECORD', id: record.id, updates: {} }
    );

    // 更新书籍状态
    const newBookAvailableStock = book.availableStock + 1;
    const updatedBook: Partial<Book> = {
      availableStock: newBookAvailableStock,
      status: newBookAvailableStock > 0 ? 'available' as BookStatus : book.status
    };

    transactionManager.addOperation(
      { type: 'UPDATE_BOOK', id: book.id, updates: updatedBook },
      { type: 'UPDATE_BOOK', id: book.id, updates: {} }
    );

    // 更新会员信息
    const updatedMember: Partial<Member> = {
      currentBorrowCount: Math.max(0, member.currentBorrowCount - 1),
      totalReadingWords: member.totalReadingWords + wordCount
    };

    transactionManager.addOperation(
      { type: 'UPDATE_MEMBER', id: member.id, updates: updatedMember },
      { type: 'UPDATE_MEMBER', id: member.id, updates: {} }
    );

    // 执行所有操作
    await IndexedDbService.update(STORES.BORROW_RECORDS, { ...record, ...updatedRecord });
    await IndexedDbService.update(STORES.BOOKS, { ...book, ...updatedBook });
    await IndexedDbService.update(STORES.MEMBERS, { ...member, ...updatedMember });

    // 提交事务
    await transactionManager.commitTransaction();

    return { ...record, ...updatedRecord } as BorrowRecord;
  } catch (error) {
    console.error('还书事务失败，执行回滚:', error);
    await transactionManager.rollbackTransaction();
    throw error;
  }
}

/**
 * 执行带事务的续借操作
 * @param record 借阅记录
 * @param member 会员
 * @returns 更新后的借阅记录
 */
export async function renewBookWithTransaction(
  record: BorrowRecord,
  member: Member
): Promise<BorrowRecord> {
  const transactionManager = TransactionManager;
  
  try {
    transactionManager.beginTransaction();

    const currentDueDate = new Date(record.dueDate);
    const newDueDate = new Date(currentDueDate);
    newDueDate.setDate(newDueDate.getDate() + member.memberType.renewDays);

    const updatedRecord: Partial<BorrowRecord> = {
      dueDate: newDueDate.toISOString(),
      renewCount: record.renewCount + 1,
      status: 'renewed' as BorrowStatus,
      updatedAt: new Date().toISOString()
    };

    transactionManager.addOperation(
      { type: 'UPDATE_BORROW_RECORD', id: record.id, updates: updatedRecord },
      { type: 'UPDATE_BORROW_RECORD', id: record.id, updates: {} }
    );

    // 执行操作
    await IndexedDbService.update(STORES.BORROW_RECORDS, { ...record, ...updatedRecord });

    // 提交事务
    await transactionManager.commitTransaction();

    return { ...record, ...updatedRecord } as BorrowRecord;
  } catch (error) {
    console.error('续借事务失败，执行回滚:', error);
    await transactionManager.rollbackTransaction();
    throw error;
  }
}
