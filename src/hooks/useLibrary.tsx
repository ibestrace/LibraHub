// 图书馆全局状态管理
import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import type { Book, Member, MemberType, BorrowRecord, BookCategory, SystemSettings, Statistics } from '@/types';
import {
  BookService,
  MemberService,
  MemberTypeService,
  BorrowService,
  CategoryService,
  SettingsService,
  StorageService
} from '@/services/storage';

// 状态类型
interface LibraryState {
  books: Book[];
  members: Member[];
  memberTypes: MemberType[];
  borrowRecords: BorrowRecord[];
  categories: BookCategory[];
  settings: SystemSettings;
  loading: boolean;
  error: string | null;
}

// 初始状态
const initialState: LibraryState = {
  books: [],
  members: [],
  memberTypes: [],
  borrowRecords: [],
  categories: [],
  settings: {
    libraryName: 'LibraHub 图书馆',
    maxBorrowDays: 30,
    maxRenewTimes: 2,
    overdueFinePerDay: 1,
    allowOverdueBorrow: false
  } as SystemSettings,
  loading: false,
  error: null
};

// Action 类型
 type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BOOKS'; payload: Book[] }
  | { type: 'SET_MEMBERS'; payload: Member[] }
  | { type: 'SET_MEMBER_TYPES'; payload: MemberType[] }
  | { type: 'SET_BORROW_RECORDS'; payload: BorrowRecord[] }
  | { type: 'SET_CATEGORIES'; payload: BookCategory[] }
  | { type: 'SET_SETTINGS'; payload: SystemSettings }
  | { type: 'SET_ALL_DATA'; payload: Partial<Omit<LibraryState, 'loading' | 'error'>> };

// Reducer - 纯函数，无副作用
function libraryReducer(state: LibraryState, action: Action): LibraryState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_BOOKS':
      return { ...state, books: action.payload };
    case 'SET_MEMBERS':
      return { ...state, members: action.payload };
    case 'SET_MEMBER_TYPES':
      return { ...state, memberTypes: action.payload };
    case 'SET_BORROW_RECORDS':
      return { ...state, borrowRecords: action.payload };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_ALL_DATA':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// 计算统计数据（纯函数，仅依赖 state 数据）
function computeStatistics(books: Book[], members: Member[], borrowRecords: BorrowRecord[]): Statistics {
  const now = new Date();
  const today = now.toDateString();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  return {
    totalBooks: books.length,
    totalMembers: members.length,
    activeMembers: members.filter(m => m.status === 'active').length,
    totalBorrows: borrowRecords.length,
    currentBorrows: borrowRecords.filter(r => r.status === 'borrowed' || r.status === 'overdue').length,
    overdueBorrows: borrowRecords.filter(r => r.status === 'overdue').length,
    todayBorrows: borrowRecords.filter(r => new Date(r.borrowDate).toDateString() === today).length,
    todayReturns: borrowRecords.filter(r => r.returnDate && new Date(r.returnDate).toDateString() === today).length,
    newMembersThisMonth: members.filter(m => {
      const d = new Date(m.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length
  };
}

// 加载所有数据的辅助函数（含逾期状态同步副作用）
function loadAllData(): Partial<Omit<LibraryState, 'loading' | 'error'>> {
  // BorrowService.getStats 会同步逾期状态到 localStorage
  BorrowService.getStats();
  return {
    books: BookService.getAll(),
    members: MemberService.getAll(),
    memberTypes: MemberTypeService.getAll(),
    borrowRecords: BorrowService.getAll(),
    categories: CategoryService.getAll(),
    settings: SettingsService.get()
  };
}

// ======== Data Context（数据 + 派生状态）========
interface LibraryDataContextType {
  state: LibraryState;
  statistics: Statistics;
}

const LibraryDataContext = createContext<LibraryDataContextType | undefined>(undefined);

// ======== Actions Context（操作方法 + dispatch）========
interface LibraryActionsContextType {
  dispatch: React.Dispatch<Action>;
  // 书籍操作
  addBook: (book: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'borrowCount'>) => Promise<Book>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<Book | null>;
  deleteBook: (id: string) => Promise<boolean>;
  searchBooks: (params: { keyword?: string; categoryId?: string; status?: string }) => Book[];
  getBookByBarcode: (barcode: string) => Book | undefined;
  // 会员操作
  addMember: (member: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'currentBorrowCount' | 'totalReadingWords'>) => Promise<Member>;
  updateMember: (id: string, updates: Partial<Member>) => Promise<Member | null>;
  deleteMember: (id: string) => Promise<boolean>;
  searchMembers: (params: { keyword?: string; status?: string }) => Member[];
  getMemberByCardNumber: (cardNumber: string) => Member | undefined;
  // 借阅操作
  borrowBook: (params: { bookId: string; memberId: string; operator: string }) => Promise<BorrowRecord>;
  returnBook: (params: { recordId: string; operator: string; fineAmount?: number; fineReason?: string }) => Promise<BorrowRecord>;
  renewBook: (params: { recordId: string; operator: string }) => Promise<BorrowRecord>;
  getOverdueBorrows: () => BorrowRecord[];
  // 分类操作
  addCategory: (category: Omit<BookCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BookCategory>;
  updateCategory: (id: string, updates: Partial<BookCategory>) => Promise<BookCategory | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  // 设置操作
  updateSettings: (settings: Partial<SystemSettings>) => Promise<SystemSettings>;
  // 数据操作
  exportData: () => string;
  importData: (data: string) => boolean;
  refreshData: () => void;
  // 辅助方法（依赖 state，放在 actions context 中通过闭包访问）
  getBookById: (id: string) => Book | undefined;
  getMemberById: (id: string) => Member | undefined;
  getCategoryById: (id: string) => BookCategory | undefined;
}

const LibraryActionsContext = createContext<LibraryActionsContextType | undefined>(undefined);

// Provider
export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(libraryReducer, initialState);

  // 统计数据派生计算
  const statistics = useMemo(
    () => computeStatistics(state.books, state.members, state.borrowRecords),
    [state.books, state.members, state.borrowRecords]
  );

  // 初始化数据
  useEffect(() => {
    dispatch({ type: 'SET_ALL_DATA', payload: loadAllData() });
  }, []);

  // 书籍操作
  const addBook = useCallback(async (book: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'borrowCount'>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const newBook = BookService.add(book);
      dispatch({ type: 'SET_BOOKS', payload: BookService.getAll() });
      return newBook;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '添加失败' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const updateBook = useCallback(async (id: string, updates: Partial<Book>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const book = BookService.update(id, updates);
      dispatch({ type: 'SET_BOOKS', payload: BookService.getAll() });
      return book;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '更新失败' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const deleteBook = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = BookService.delete(id);
      dispatch({ type: 'SET_BOOKS', payload: BookService.getAll() });
      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '删除失败' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const searchBooks = useCallback((params: { keyword?: string; categoryId?: string; status?: string }) => {
    return BookService.search(params);
  }, []);

  const getBookByBarcode = useCallback((barcode: string) => {
    return BookService.getByBarcode(barcode);
  }, []);

  const getBookById = useCallback((id: string) => {
    return state.books.find(book => book.id === id);
  }, [state.books]);

  // 会员操作
  const addMember = useCallback(async (member: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'currentBorrowCount' | 'totalReadingWords'>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const newMember = MemberService.add(member);
      dispatch({ type: 'SET_MEMBERS', payload: MemberService.getAll() });
      return newMember;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '添加失败' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const updateMember = useCallback(async (id: string, updates: Partial<Member>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const member = MemberService.update(id, updates);
      dispatch({ type: 'SET_MEMBERS', payload: MemberService.getAll() });
      return member;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '更新失败' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = MemberService.delete(id);
      dispatch({ type: 'SET_MEMBERS', payload: MemberService.getAll() });
      return result;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '删除失败' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const searchMembers = useCallback((params: { keyword?: string; status?: string }) => {
    return MemberService.search(params);
  }, []);

  const getMemberByCardNumber = useCallback((cardNumber: string) => {
    return MemberService.getByCardNumber(cardNumber);
  }, []);

  const getMemberById = useCallback((id: string) => {
    return state.members.find(member => member.id === id);
  }, [state.members]);

  // 借阅操作
  const borrowBook = useCallback(async (params: { bookId: string; memberId: string; operator: string }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const record = BorrowService.borrow(params);
      dispatch({ type: 'SET_BORROW_RECORDS', payload: BorrowService.getAll() });
      dispatch({ type: 'SET_BOOKS', payload: BookService.getAll() });
      dispatch({ type: 'SET_MEMBERS', payload: MemberService.getAll() });
      return record;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '借阅失败' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const returnBook = useCallback(async (params: { recordId: string; operator: string; fineAmount?: number; fineReason?: string }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const record = BorrowService.return(params);
      dispatch({ type: 'SET_BORROW_RECORDS', payload: BorrowService.getAll() });
      dispatch({ type: 'SET_BOOKS', payload: BookService.getAll() });
      dispatch({ type: 'SET_MEMBERS', payload: MemberService.getAll() });
      return record;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '归还失败' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const renewBook = useCallback(async (params: { recordId: string; operator: string }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const record = BorrowService.renew(params);
      dispatch({ type: 'SET_BORROW_RECORDS', payload: BorrowService.getAll() });
      return record;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : '续借失败' });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const getOverdueBorrows = useCallback(() => {
    return BorrowService.getOverdueBorrows();
  }, []);

  // 分类操作
  const addCategory = useCallback(async (category: Omit<BookCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCategory = CategoryService.add(category);
    dispatch({ type: 'SET_CATEGORIES', payload: CategoryService.getAll() });
    return newCategory;
  }, []);

  const updateCategory = useCallback(async (id: string, updates: Partial<BookCategory>) => {
    const category = CategoryService.update(id, updates);
    dispatch({ type: 'SET_CATEGORIES', payload: CategoryService.getAll() });
    return category;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const result = CategoryService.delete(id);
    dispatch({ type: 'SET_CATEGORIES', payload: CategoryService.getAll() });
    return result;
  }, []);

  const getCategoryById = useCallback((id: string) => {
    return state.categories.find(category => category.id === id);
  }, [state.categories]);

  // 设置操作
  const updateSettings = useCallback(async (settings: Partial<SystemSettings>) => {
    const updated = SettingsService.update(settings);
    dispatch({ type: 'SET_SETTINGS', payload: updated });
    return updated;
  }, []);

  // 数据操作
  const exportData = useCallback(() => {
    return StorageService.exportAll();
  }, []);

  const importData = useCallback((data: string) => {
    const result = StorageService.importAll(data);
    if (result) {
      dispatch({ type: 'SET_ALL_DATA', payload: loadAllData() });
    }
    return result;
  }, []);

  const refreshData = useCallback(() => {
    dispatch({ type: 'SET_ALL_DATA', payload: loadAllData() });
  }, []);

  // Data context value — 仅在 state/statistics 变化时更新
  const dataValue = useMemo(() => ({
    state,
    statistics
  }), [state, statistics]);

  // Actions context value — 大部分方法稳定，不依赖 state
  const actionsValue = useMemo(() => ({
    dispatch,
    addBook,
    updateBook,
    deleteBook,
    searchBooks,
    getBookByBarcode,
    getBookById,
    addMember,
    updateMember,
    deleteMember,
    searchMembers,
    getMemberByCardNumber,
    getMemberById,
    borrowBook,
    returnBook,
    renewBook,
    getOverdueBorrows,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    updateSettings,
    exportData,
    importData,
    refreshData
  }), [
    dispatch,
    addBook,
    updateBook,
    deleteBook,
    searchBooks,
    getBookByBarcode,
    getBookById,
    addMember,
    updateMember,
    deleteMember,
    searchMembers,
    getMemberByCardNumber,
    getMemberById,
    borrowBook,
    returnBook,
    renewBook,
    getOverdueBorrows,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    updateSettings,
    exportData,
    importData,
    refreshData
  ]);

  return (
    <LibraryDataContext.Provider value={dataValue}>
      <LibraryActionsContext.Provider value={actionsValue}>
        {children}
      </LibraryActionsContext.Provider>
    </LibraryDataContext.Provider>
  );
}

// 组合 Hook（向后兼容）
export function useLibrary() {
  const data = useContext(LibraryDataContext);
  const actions = useContext(LibraryActionsContext);
  if (data === undefined || actions === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return { ...data, ...actions };
}

// 仅订阅数据的 Hook（性能优化：不随操作方法变化而重渲染）
export function useLibraryData() {
  const context = useContext(LibraryDataContext);
  if (context === undefined) {
    throw new Error('useLibraryData must be used within a LibraryProvider');
  }
  return context;
}

// 仅订阅操作方法的 Hook（性能优化：不随 state 变化而重渲染）
export function useLibraryActions() {
  const context = useContext(LibraryActionsContext);
  if (context === undefined) {
    throw new Error('useLibraryActions must be used within a LibraryProvider');
  }
  return context;
}
