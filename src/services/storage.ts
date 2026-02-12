// 数据存储服务 - 使用 localStorage 实现数据持久化
// 可轻松迁移到 IndexedDB 或后端 API

import type {
  Book,
  Member,
  MemberType,
  BorrowRecord,
  BookCategory,
  OperationLog,
  SystemSettings,
  BookStatus,
  BorrowStatus
} from '@/types';

// 存储键名
const STORAGE_KEYS = {
  BOOKS: 'library_books',
  MEMBERS: 'library_members',
  MEMBER_TYPES: 'library_member_types',
  BORROW_RECORDS: 'library_borrow_records',
  RESERVATIONS: 'library_reservations',
  CATEGORIES: 'library_categories',
  LOGS: 'library_logs',
  SETTINGS: 'library_settings',
  OPERATORS: 'library_operators'
};

// 通用存储操作
class StorageService {
  // 获取数据
  static get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return defaultValue;
    }
  }

  // 保存数据
  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing ${key}:`, error);
      throw new Error('存储空间不足，请备份数据后清理');
    }
  }

  // 删除数据
  static remove(key: string): void {
    localStorage.removeItem(key);
  }

  // 导出所有数据（用于备份）
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
      settings: this.get(STORAGE_KEYS.SETTINGS, {})
    };
    return JSON.stringify(data, null, 2);
  }

  // 导入所有数据（用于恢复）
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
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }

  // 清空所有数据
  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
}

// 书籍相关操作
export class BookService {
  // 获取所有书籍
  static getAll(): Book[] {
    return StorageService.get<Book[]>(STORAGE_KEYS.BOOKS, []);
  }

  // 根据ID获取书籍
  static getById(id: string): Book | undefined {
    const books = this.getAll();
    return books.find(b => b.id === id);
  }

  // 根据条形码获取书籍
  static getByBarcode(barcode: string): Book | undefined {
    const books = this.getAll();
    return books.find(b => b.barcode === barcode);
  }

  // 搜索书籍
  static search(params: {
    keyword?: string;
    categoryId?: string;
    status?: string;
    author?: string;
    publisher?: string;
  }): Book[] {
    let books = this.getAll();
    
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      books = books.filter(b => 
        b.title.toLowerCase().includes(kw) ||
        b.author.toLowerCase().includes(kw) ||
        b.barcode.toLowerCase().includes(kw) ||
        b.isbn.toLowerCase().includes(kw)
      );
    }
    
    if (params.categoryId) {
      books = books.filter(b => b.categoryId === params.categoryId);
    }
    
    if (params.status) {
      books = books.filter(b => b.status === params.status);
    }
    
    if (params.author) {
      books = books.filter(b => b.author.includes(params.author!));
    }
    
    if (params.publisher) {
      books = books.filter(b => b.publisher.includes(params.publisher!));
    }
    
    return books;
  }

  // 添加书籍
  static add(book: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'borrowCount'>): Book {
    const books = this.getAll();
    
    // 检查条形码是否已存在
    if (books.some(b => b.barcode === book.barcode)) {
      throw new Error('条形码已存在');
    }
    
    const newBook: Book = {
      ...book,
      id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      borrowCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    books.push(newBook);
    StorageService.set(STORAGE_KEYS.BOOKS, books);
    
    // 记录日志
    LogService.add('book', '添加书籍', newBook.id, newBook.title, `添加书籍《${newBook.title}》`);
    
    return newBook;
  }

  // 更新书籍
  static update(id: string, updates: Partial<Book>): Book | null {
    const books = this.getAll();
    const index = books.findIndex(b => b.id === id);
    
    if (index === -1) return null;
    
    // 检查条形码冲突
    if (updates.barcode && updates.barcode !== books[index].barcode) {
      if (books.some(b => b.barcode === updates.barcode && b.id !== id)) {
        throw new Error('条形码已存在');
      }
    }
    
    books[index] = {
      ...books[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    StorageService.set(STORAGE_KEYS.BOOKS, books);
    
    LogService.add('book', '更新书籍', id, books[index].title, `更新书籍《${books[index].title}》`);
    
    return books[index];
  }

  // 删除书籍
  static delete(id: string): boolean {
    const books = this.getAll();
    const book = books.find(b => b.id === id);
    
    if (!book) return false;
    
    // 检查是否有未归还的借阅
    const borrowRecords = BorrowService.getAll();
    if (borrowRecords.some(r => r.bookId === id && r.status === 'borrowed')) {
      throw new Error('该书籍有未归还的借阅记录，无法删除');
    }
    
    const filtered = books.filter(b => b.id !== id);
    StorageService.set(STORAGE_KEYS.BOOKS, filtered);
    
    LogService.add('book', '删除书籍', id, book.title, `删除书籍《${book.title}》`);
    
    return true;
  }

  // 获取书籍统计
  static getStats() {
    const books = this.getAll();
    return {
      total: books.length,
      available: books.filter(b => b.status === 'available').length,
      borrowed: books.filter(b => b.status === 'borrowed').length,
      damaged: books.filter(b => b.status === 'damaged').length,
      lost: books.filter(b => b.status === 'lost').length
    };
  }
}

// 会员相关操作
export class MemberService {
  static getAll(): Member[] {
    return StorageService.get<Member[]>(STORAGE_KEYS.MEMBERS, []);
  }

  static getById(id: string): Member | undefined {
    return this.getAll().find(m => m.id === id);
  }

  static getByCardNumber(cardNumber: string): Member | undefined {
    return this.getAll().find(m => m.cardNumber === cardNumber);
  }

  static search(params: {
    keyword?: string;
    status?: string;
    memberTypeId?: string;
  }): Member[] {
    let members = this.getAll();
    
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      members = members.filter(m => 
        m.name.toLowerCase().includes(kw) ||
        m.cardNumber.toLowerCase().includes(kw) ||
        m.phone.includes(kw)
      );
    }
    
    if (params.status) {
      members = members.filter(m => m.status === params.status);
    }
    
    if (params.memberTypeId) {
      members = members.filter(m => m.memberType.id === params.memberTypeId);
    }
    
    return members;
  }

  static add(member: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'currentBorrowCount'>): Member {
    const members = this.getAll();
    
    if (members.some(m => m.cardNumber === member.cardNumber)) {
      throw new Error('会员卡号已存在');
    }
    
    const newMember: Member = {
      ...member,
      id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentBorrowCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    members.push(newMember);
    StorageService.set(STORAGE_KEYS.MEMBERS, members);
    
    LogService.add('member', '添加会员', newMember.id, newMember.name, `添加会员 ${newMember.name}`);
    
    return newMember;
  }

  static update(id: string, updates: Partial<Member>): Member | null {
    const members = this.getAll();
    const index = members.findIndex(m => m.id === id);
    
    if (index === -1) return null;
    
    if (updates.cardNumber && updates.cardNumber !== members[index].cardNumber) {
      if (members.some(m => m.cardNumber === updates.cardNumber && m.id !== id)) {
        throw new Error('会员卡号已存在');
      }
    }
    
    members[index] = {
      ...members[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    StorageService.set(STORAGE_KEYS.MEMBERS, members);
    
    LogService.add('member', '更新会员', id, members[index].name, `更新会员 ${members[index].name}`);
    
    return members[index];
  }

  static delete(id: string): boolean {
    const members = this.getAll();
    const member = members.find(m => m.id === id);
    
    if (!member) return false;
    
    // 检查是否有未归还的借阅
    const borrowRecords = BorrowService.getAll();
    if (borrowRecords.some(r => r.memberId === id && r.status === 'borrowed')) {
      throw new Error('该会员有未归还的借阅记录，无法删除');
    }
    
    const filtered = members.filter(m => m.id !== id);
    StorageService.set(STORAGE_KEYS.MEMBERS, filtered);
    
    LogService.add('member', '删除会员', id, member.name, `删除会员 ${member.name}`);
    
    return true;
  }

  static getStats() {
    const members = this.getAll();
    return {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      expired: members.filter(m => m.status === 'expired').length,
      suspended: members.filter(m => m.status === 'suspended').length
    };
  }
}

// 会员类型操作
export class MemberTypeService {
  static getAll(): MemberType[] {
    return StorageService.get<MemberType[]>(STORAGE_KEYS.MEMBER_TYPES, [
      {
        id: 'default_normal',
        name: '普通会员',
        durationMonths: 12,
        maxBorrowCount: 5,
        maxBorrowDays: 30,
        renewTimes: 2,
        renewDays: 15,
        depositAmount: 100,
        fee: 50,
        description: '普通会员，可借5本书，借期30天',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'default_vip',
        name: 'VIP会员',
        durationMonths: 12,
        maxBorrowCount: 10,
        maxBorrowDays: 60,
        renewTimes: 3,
        renewDays: 30,
        depositAmount: 200,
        fee: 200,
        description: 'VIP会员，可借10本书，借期60天',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
  }

  static getById(id: string): MemberType | undefined {
    return this.getAll().find(t => t.id === id);
  }

  static add(type: Omit<MemberType, 'id' | 'createdAt' | 'updatedAt'>): MemberType {
    const types = this.getAll();
    const newType: MemberType = {
      ...type,
      id: `type_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    types.push(newType);
    StorageService.set(STORAGE_KEYS.MEMBER_TYPES, types);
    return newType;
  }

  static update(id: string, updates: Partial<MemberType>): MemberType | null {
    const types = this.getAll();
    const index = types.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    types[index] = {
      ...types[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    StorageService.set(STORAGE_KEYS.MEMBER_TYPES, types);
    return types[index];
  }

  static delete(id: string): boolean {
    const types = this.getAll();
    const members = MemberService.getAll();
    
    // 检查是否有会员使用此类型
    if (members.some(m => m.memberType.id === id)) {
      throw new Error('有会员正在使用此类型，无法删除');
    }
    
    const filtered = types.filter(t => t.id !== id);
    StorageService.set(STORAGE_KEYS.MEMBER_TYPES, filtered);
    return true;
  }
}

// 借阅记录操作
export class BorrowService {
  static getAll(): BorrowRecord[] {
    return StorageService.get<BorrowRecord[]>(STORAGE_KEYS.BORROW_RECORDS, []);
  }

  static getById(id: string): BorrowRecord | undefined {
    return this.getAll().find(r => r.id === id);
  }

  static getByMember(memberId: string): BorrowRecord[] {
    return this.getAll().filter(r => r.memberId === memberId);
  }

  static getByBook(bookId: string): BorrowRecord[] {
    return this.getAll().filter(r => r.bookId === bookId);
  }

  static getCurrentBorrows(): BorrowRecord[] {
    return this.getAll().filter(r => r.status === 'borrowed' || r.status === 'overdue');
  }

  static getOverdueBorrows(): BorrowRecord[] {
    const now = new Date().toISOString();
    const records = this.getAll();
    let hasUpdates = false;
    
    // 更新已逾期但状态仍为 borrowed 的记录
    const updatedRecords = records.map(r => {
      if (r.status === 'borrowed' && r.dueDate < now) {
        hasUpdates = true;
        return { ...r, status: 'overdue' as BorrowStatus, updatedAt: now };
      }
      return r;
    });
    
    // 如果有更新，保存到存储
    if (hasUpdates) {
      StorageService.set(STORAGE_KEYS.BORROW_RECORDS, updatedRecords);
    }
    
    return updatedRecords.filter(r => r.status === 'overdue');
  }

  // 借书
  static borrow(params: {
    bookId: string;
    memberId: string;
    operator: string;
    notes?: string;
  }): BorrowRecord {
    const { bookId, memberId, operator, notes } = params;
    
    const book = BookService.getById(bookId);
    if (!book) throw new Error('书籍不存在');
    if (book.status !== 'available') throw new Error('该书籍不可借阅');
    if (book.availableStock <= 0) throw new Error('该书籍库存不足');
    
    const member = MemberService.getById(memberId);
    if (!member) throw new Error('会员不存在');
    if (member.status !== 'active') throw new Error('会员状态异常，无法借阅');
    if (member.currentBorrowCount >= member.memberType.maxBorrowCount) {
      throw new Error(`已达到最大借阅数量限制（${member.memberType.maxBorrowCount}本）`);
    }
    
    // 检查是否有逾期未还
    const settings = SettingsService.get();
    const overdueBorrows = this.getOverdueBorrows().filter(r => r.memberId === memberId);
    if (overdueBorrows.length > 0 && !settings.allowOverdueBorrow) {
      throw new Error('有逾期未还的书籍，请先归还');
    }
    
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + member.memberType.maxBorrowDays);
    
    const record: BorrowRecord = {
      id: `borrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bookId,
      bookBarcode: book.barcode,
      bookTitle: book.title,
      bookAuthor: book.author,
      memberId,
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
    
    const records = this.getAll();
    records.push(record);
    StorageService.set(STORAGE_KEYS.BORROW_RECORDS, records);
    
    // 更新书籍状态
    const newAvailableStock = book.availableStock - 1;
    BookService.update(bookId, {
      availableStock: newAvailableStock,
      status: newAvailableStock === 0 ? 'borrowed' as BookStatus : book.status,
      borrowCount: book.borrowCount + 1
    });
    
    // 更新会员借阅数量
    MemberService.update(memberId, {
      currentBorrowCount: member.currentBorrowCount + 1
    });
    
    LogService.add('borrow', '借书', record.id, book.title, 
      `会员 ${member.name} 借阅《${book.title}》`);
    
    return record;
  }

  // 还书
  static return(params: {
    recordId: string;
    operator: string;
    fineAmount?: number;
    fineReason?: string;
  }): BorrowRecord {
    const { recordId, operator, fineAmount = 0, fineReason } = params;
    
    const records = this.getAll();
    const index = records.findIndex(r => r.id === recordId);
    
    if (index === -1) throw new Error('借阅记录不存在');
    if (records[index].status === 'returned') throw new Error('该书籍已归还');
    
    const record = records[index];
    const now = new Date().toISOString();
    
    // 更新借阅记录
    records[index] = {
      ...record,
      returnDate: now,
      status: 'returned' as BorrowStatus,
      fineAmount,
      fineReason,
      operator,
      updatedAt: now
    };
    
    StorageService.set(STORAGE_KEYS.BORROW_RECORDS, records);
    
    // 更新书籍状态
    const book = BookService.getById(record.bookId);
    if (book) {
      BookService.update(record.bookId, {
        availableStock: book.availableStock + 1,
        status: 'available' as BookStatus
      });
    }
    
    // 更新会员借阅数量
    const member = MemberService.getById(record.memberId);
    if (member) {
      MemberService.update(record.memberId, {
        currentBorrowCount: Math.max(0, member.currentBorrowCount - 1)
      });
    }
    
    LogService.add('return', '还书', record.id, record.bookTitle,
      `会员 ${record.memberName} 归还《${record.bookTitle}》`);
    
    return records[index];
  }

  // 续借
  static renew(params: {
    recordId: string;
    operator: string;
  }): BorrowRecord {
    const { recordId, operator } = params;
    
    const records = this.getAll();
    const index = records.findIndex(r => r.id === recordId);
    
    if (index === -1) throw new Error('借阅记录不存在');
    
    const record = records[index];
    if (record.status !== 'borrowed') throw new Error('只能续借借阅中的书籍');
    
    const member = MemberService.getById(record.memberId);
    if (!member) throw new Error('会员不存在');
    
    if (record.renewCount >= member.memberType.renewTimes) {
      throw new Error(`已达到最大续借次数（${member.memberType.renewTimes}次）`);
    }
    
    // 检查是否已逾期
    if (new Date() > new Date(record.dueDate)) {
      throw new Error('已逾期，无法续借');
    }
    
    const newDueDate = new Date(record.dueDate);
    newDueDate.setDate(newDueDate.getDate() + member.memberType.renewDays);
    
    records[index] = {
      ...record,
      dueDate: newDueDate.toISOString(),
      renewCount: record.renewCount + 1,
      status: 'renewed' as BorrowStatus,
      operator,
      updatedAt: new Date().toISOString()
    };
    
    StorageService.set(STORAGE_KEYS.BORROW_RECORDS, records);
    
    LogService.add('renew', '续借', record.id, record.bookTitle,
      `会员 ${record.memberName} 续借《${record.bookTitle}》`);
    
    return records[index];
  }

  static getStats() {
    const records = this.getAll();
    const now = new Date().toISOString();
    const today = new Date().toDateString();
    
    // 确保逾期记录状态正确
    let hasUpdates = false;
    const updatedRecords = records.map(r => {
      if (r.status === 'borrowed' && r.dueDate < now) {
        hasUpdates = true;
        return { ...r, status: 'overdue' as BorrowStatus, updatedAt: now };
      }
      return r;
    });
    
    if (hasUpdates) {
      StorageService.set(STORAGE_KEYS.BORROW_RECORDS, updatedRecords);
    }
    
    return {
      total: updatedRecords.length,
      current: updatedRecords.filter(r => r.status === 'borrowed' || r.status === 'overdue').length,
      overdue: updatedRecords.filter(r => r.status === 'overdue').length,
      returned: updatedRecords.filter(r => r.status === 'returned').length,
      todayBorrows: updatedRecords.filter(r => 
        new Date(r.borrowDate).toDateString() === today
      ).length,
      todayReturns: updatedRecords.filter(r => 
        r.returnDate && new Date(r.returnDate).toDateString() === today
      ).length
    };
  }
}

// 分类操作
export class CategoryService {
  static getAll(): BookCategory[] {
    return StorageService.get<BookCategory[]>(STORAGE_KEYS.CATEGORIES, [
      { id: 'cat_1', name: '文学', code: 'WX', description: '文学作品', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'cat_2', name: '历史', code: 'LS', description: '历史书籍', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'cat_3', name: '科技', code: 'KJ', description: '科技书籍', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'cat_4', name: '艺术', code: 'YS', description: '艺术书籍', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'cat_5', name: '教育', code: 'JY', description: '教育书籍', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'cat_6', name: '经济', code: 'JJ', description: '经济书籍', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'cat_7', name: '哲学', code: 'ZX', description: '哲学书籍', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'cat_8', name: '其他', code: 'QT', description: '其他类别', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ]);
  }

  static getById(id: string): BookCategory | undefined {
    return this.getAll().find(c => c.id === id);
  }

  static add(category: Omit<BookCategory, 'id' | 'createdAt' | 'updatedAt'>): BookCategory {
    const categories = this.getAll();
    const newCategory: BookCategory = {
      ...category,
      id: `cat_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    categories.push(newCategory);
    StorageService.set(STORAGE_KEYS.CATEGORIES, categories);
    return newCategory;
  }

  static update(id: string, updates: Partial<BookCategory>): BookCategory | null {
    const categories = this.getAll();
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    categories[index] = {
      ...categories[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    StorageService.set(STORAGE_KEYS.CATEGORIES, categories);
    return categories[index];
  }

  static delete(id: string): boolean {
    const categories = this.getAll();
    const books = BookService.getAll();
    
    if (books.some(b => b.categoryId === id)) {
      throw new Error('该分类下有书籍，无法删除');
    }
    
    const filtered = categories.filter(c => c.id !== id);
    StorageService.set(STORAGE_KEYS.CATEGORIES, filtered);
    return true;
  }
}

// 日志操作
export class LogService {
  static getAll(): OperationLog[] {
    return StorageService.get<OperationLog[]>(STORAGE_KEYS.LOGS, []);
  }

  static add(
    type: OperationLog['type'],
    action: string,
    targetId: string,
    targetName: string,
    details?: string
  ): OperationLog {
    const logs = this.getAll();
    const log: OperationLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      targetId,
      targetName,
      details,
      operator: 'system',
      createdAt: new Date().toISOString()
    };
    
    logs.unshift(log);
    // 只保留最近1000条日志
    if (logs.length > 1000) {
      logs.length = 1000;
    }
    
    StorageService.set(STORAGE_KEYS.LOGS, logs);
    return log;
  }

  static clear(): void {
    StorageService.set(STORAGE_KEYS.LOGS, []);
  }
}

// 系统设置操作
export class SettingsService {
  static get(): SystemSettings {
    return StorageService.get<SystemSettings>(STORAGE_KEYS.SETTINGS, {
      libraryName: 'LibraHub 图书馆',
      libraryAddress: '',
      libraryPhone: '',
      libraryEmail: '',
      maxBorrowDays: 30,
      maxRenewTimes: 2,
      renewDays: 15,
      overdueFinePerDay: 1,
      allowOverdueBorrow: false
    });
  }

  static update(settings: Partial<SystemSettings>): SystemSettings {
    const current = this.get();
    const updated = { ...current, ...settings };
    StorageService.set(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  }
}

// 导出所有服务
export { StorageService, STORAGE_KEYS };
