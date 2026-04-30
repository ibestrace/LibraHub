// Unified Storage Service - 统一存储抽象层
// 基于 storage.ts 中的 Service 提供异步 API，为 future IndexedDB 迁移预留接口

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
import {
  BookService,
  MemberService,
  MemberTypeService,
  BorrowService,
  CategoryService,
  SettingsService,
  MemberGroupService,
  ReadingStatsService,
  StorageService,
  STORAGE_KEYS
} from './storage';

// 存储后端类型
export type StorageBackend = 'localStorage' | 'indexedDB';

/**
 * UnifiedStorage 统一存储服务
 * 提供统一的异步 API，当前底层使用 storage.ts 中的 Service（localStorage）
 * 未来可无缝切换到 IndexedDB
 */
export class UnifiedStorage {
  private backend: StorageBackend;

  constructor(backend: StorageBackend = 'localStorage') {
    this.backend = backend;
  }

  getBackend(): StorageBackend {
    return this.backend;
  }

  async switchBackend(backend: StorageBackend): Promise<void> {
    this.backend = backend;
  }

  // ==================== 书籍相关方法 ====================

  async getBooks(): Promise<Book[]> {
    return BookService.getAll();
  }

  async getBookById(id: string): Promise<Book | undefined> {
    return BookService.getById(id);
  }

  async saveBook(book: Book): Promise<Book> {
    const existing = BookService.getById(book.id);
    if (existing) {
      const updated = BookService.update(book.id, book);
      if (!updated) throw new Error('更新书籍失败');
      return updated;
    }
    // 对于新增，需要转换类型
    const { id, createdAt, updatedAt, borrowCount, ...rest } = book;
    return BookService.add(rest as Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'borrowCount'>);
  }

  async saveBooks(books: Book[]): Promise<void> {
    for (const book of books) {
      await this.saveBook(book);
    }
  }

  async deleteBook(id: string): Promise<void> {
    BookService.delete(id);
  }

  // ==================== 会员相关方法 ====================

  async getMembers(): Promise<Member[]> {
    return MemberService.getAll();
  }

  async getMemberById(id: string): Promise<Member | undefined> {
    return MemberService.getById(id);
  }

  async saveMember(member: Member): Promise<Member> {
    const existing = MemberService.getById(member.id);
    if (existing) {
      const updated = MemberService.update(member.id, member);
      if (!updated) throw new Error('更新会员失败');
      return updated;
    }
    const { id, createdAt, updatedAt, currentBorrowCount, totalReadingWords, ...rest } = member;
    return MemberService.add(rest as Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'currentBorrowCount' | 'totalReadingWords'>);
  }

  async saveMembers(members: Member[]): Promise<void> {
    for (const member of members) {
      await this.saveMember(member);
    }
  }

  async deleteMember(id: string): Promise<void> {
    MemberService.delete(id);
  }

  // ==================== 会员类型相关方法 ====================

  async getMemberTypes(): Promise<MemberType[]> {
    return MemberTypeService.getAll();
  }

  async saveMemberType(memberType: MemberType): Promise<MemberType> {
    const existing = MemberTypeService.getById(memberType.id);
    if (existing) {
      const updated = MemberTypeService.update(memberType.id, memberType);
      if (!updated) throw new Error('更新会员类型失败');
      return updated;
    }
    return MemberTypeService.add(memberType);
  }

  async saveMemberTypes(memberTypes: MemberType[]): Promise<void> {
    for (const type of memberTypes) {
      await this.saveMemberType(type);
    }
  }

  async deleteMemberType(id: string): Promise<void> {
    MemberTypeService.delete(id);
  }

  // ==================== 借阅记录相关方法 ====================

  async getBorrowRecords(): Promise<BorrowRecord[]> {
    return BorrowService.getAll();
  }

  async getBorrowRecordById(id: string): Promise<BorrowRecord | undefined> {
    return BorrowService.getById(id);
  }

  async saveBorrowRecord(record: BorrowRecord): Promise<BorrowRecord> {
    // BorrowRecord 的添加通过 BorrowService.borrow 完成，不支持直接 save
    throw new Error('请使用 BorrowService.borrow 创建借阅记录');
  }

  async saveBorrowRecords(records: BorrowRecord[]): Promise<void> {
    // 批量保存借阅记录（用于导入）
    const allRecords = BorrowService.getAll();
    const recordMap = new Map(allRecords.map(r => [r.id, r]));
    for (const record of records) {
      recordMap.set(record.id, record);
    }
    StorageService.set(STORAGE_KEYS.BORROW_RECORDS, Array.from(recordMap.values()));
  }

  async deleteBorrowRecord(id: string): Promise<void> {
    const records = BorrowService.getAll().filter(r => r.id !== id);
    StorageService.set(STORAGE_KEYS.BORROW_RECORDS, records);
  }

  // ==================== 书籍分类相关方法 ====================

  async getCategories(): Promise<BookCategory[]> {
    return CategoryService.getAll();
  }

  async saveCategory(category: BookCategory): Promise<BookCategory> {
    const existing = CategoryService.getById(category.id);
    if (existing) {
      const updated = CategoryService.update(category.id, category);
      if (!updated) throw new Error('更新分类失败');
      return updated;
    }
    return CategoryService.add(category);
  }

  async saveCategories(categories: BookCategory[]): Promise<void> {
    for (const category of categories) {
      await this.saveCategory(category);
    }
  }

  async deleteCategory(id: string): Promise<void> {
    CategoryService.delete(id);
  }

  // ==================== 预约记录相关方法 ====================

  async getReservations(): Promise<ReservationRecord[]> {
    return [];
  }

  async saveReservation(reservation: ReservationRecord): Promise<ReservationRecord> {
    throw new Error('预约功能暂未实现');
  }

  async deleteReservation(id: string): Promise<void> {
    throw new Error('预约功能暂未实现');
  }

  // ==================== 操作日志相关方法 ====================

  async getLogs(): Promise<OperationLog[]> {
    return [];
  }

  async saveLog(log: OperationLog): Promise<OperationLog> {
    throw new Error('日志功能请使用 LogService');
  }

  async deleteLog(id: string): Promise<void> {
    throw new Error('日志功能请使用 LogService');
  }

  // ==================== 系统设置相关方法 ====================

  async getSettings(): Promise<SystemSettings> {
    return SettingsService.get();
  }

  async saveSettings(settings: SystemSettings): Promise<SystemSettings> {
    return SettingsService.update(settings);
  }

  // ==================== 会员分组相关方法 ====================

  async getMemberGroups(): Promise<MemberGroup[]> {
    return MemberGroupService.getAll();
  }

  async saveMemberGroup(group: MemberGroup): Promise<MemberGroup> {
    const existing = MemberGroupService.getById(group.id);
    if (existing) {
      const updated = MemberGroupService.update(group.id, group);
      return updated;
    }
    return MemberGroupService.add(group);
  }

  async deleteMemberGroup(id: string): Promise<void> {
    MemberGroupService.delete(id);
  }

  // ==================== 阅读统计相关方法 ====================

  async getReadingStats(): Promise<ReadingStats[]> {
    return ReadingStatsService.getAll();
  }

  async saveReadingStats(stats: ReadingStats): Promise<ReadingStats> {
    throw new Error('阅读统计请使用 ReadingStatsService.updateStats');
  }

  // ==================== 数据导出/导入 ====================

  async exportAll(): Promise<string> {
    return StorageService.exportAll();
  }

  async importAll(jsonData: string): Promise<boolean> {
    return StorageService.importAll(jsonData);
  }

  // ==================== 清空数据 ====================

  async clearAll(): Promise<void> {
    StorageService.clearAll();
  }

  // ==================== 统计信息 ====================

  async getStats(): Promise<Record<string, number>> {
    return {
      books: BookService.getAll().length,
      members: MemberService.getAll().length,
      memberTypes: MemberTypeService.getAll().length,
      borrowRecords: BorrowService.getAll().length,
      categories: CategoryService.getAll().length,
      memberGroups: MemberGroupService.getAll().length,
      readingStats: ReadingStatsService.getAll().length
    };
  }
}

// 导出单例实例
export const storage = new UnifiedStorage('localStorage');
