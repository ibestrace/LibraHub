// 图书馆全局状态管理
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { Book, Member, MemberType, BorrowRecord, BookCategory, SystemSettings } from '@/types';
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
  statistics: {
    totalBooks: number;
    totalMembers: number;
    activeMembers: number;
    totalBorrows: number;
    currentBorrows: number;
    overdueBorrows: number;
    todayBorrows: number;
    todayReturns: number;
    newMembersThisMonth: number;
  };
  loading: boolean;
  error: string | null;
}

// 初始状态
const initialState: LibraryState = {
  books: BookService.getAll(),
  members: MemberService.getAll(),
  memberTypes: MemberTypeService.getAll(),
  borrowRecords: BorrowService.getAll(),
  categories: CategoryService.getAll(),
  settings: SettingsService.get(),
  statistics: {
    totalBooks: 0,
    totalMembers: 0,
    activeMembers: 0,
    totalBorrows: 0,
    currentBorrows: 0,
    overdueBorrows: 0,
    todayBorrows: 0,
    todayReturns: 0,
    newMembersThisMonth: 0
  },
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
  | { type: 'UPDATE_STATISTICS' }
  | { type: 'REFRESH_ALL' };

// Reducer
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
    case 'UPDATE_STATISTICS': {
      const bookStats = BookService.getStats();
      const memberStats = MemberService.getStats();
      const borrowStats = BorrowService.getStats();
      
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      
      return {
        ...state,
        statistics: {
          totalBooks: bookStats.total,
          totalMembers: memberStats.total,
          activeMembers: memberStats.active,
          totalBorrows: borrowStats.total,
          currentBorrows: borrowStats.current,
          overdueBorrows: borrowStats.overdue,
          todayBorrows: borrowStats.todayBorrows,
          todayReturns: borrowStats.todayReturns,
          newMembersThisMonth: state.members.filter(m => {
            const d = new Date(m.createdAt);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
          }).length
        }
      };
    }
    case 'REFRESH_ALL':
      return {
        ...state,
        books: BookService.getAll(),
        members: MemberService.getAll(),
        memberTypes: MemberTypeService.getAll(),
        borrowRecords: BorrowService.getAll(),
        categories: CategoryService.getAll(),
        settings: SettingsService.get()
      };
    default:
      return state;
  }
}

// Context
interface LibraryContextType {
  state: LibraryState;
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
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

// Provider
export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(libraryReducer, initialState);

  // 初始化数据
  useEffect(() => {
    dispatch({ type: 'REFRESH_ALL' });
    dispatch({ type: 'UPDATE_STATISTICS' });
  }, []);

  // 书籍操作
  const addBook = useCallback(async (book: Omit<Book, 'id' | 'createdAt' | 'updatedAt' | 'borrowCount'>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const newBook = BookService.add(book);
      dispatch({ type: 'SET_BOOKS', payload: BookService.getAll() });
      dispatch({ type: 'UPDATE_STATISTICS' });
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
      dispatch({ type: 'UPDATE_STATISTICS' });
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
      dispatch({ type: 'UPDATE_STATISTICS' });
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

  // 会员操作
  const addMember = useCallback(async (member: Omit<Member, 'id' | 'createdAt' | 'updatedAt' | 'currentBorrowCount' | 'totalReadingWords'>) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const newMember = MemberService.add(member);
      dispatch({ type: 'SET_MEMBERS', payload: MemberService.getAll() });
      dispatch({ type: 'UPDATE_STATISTICS' });
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
      dispatch({ type: 'UPDATE_STATISTICS' });
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
      dispatch({ type: 'UPDATE_STATISTICS' });
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

  // 借阅操作
  const borrowBook = useCallback(async (params: { bookId: string; memberId: string; operator: string }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const record = BorrowService.borrow(params);
      dispatch({ type: 'SET_BORROW_RECORDS', payload: BorrowService.getAll() });
      dispatch({ type: 'SET_BOOKS', payload: BookService.getAll() });
      dispatch({ type: 'SET_MEMBERS', payload: MemberService.getAll() });
      dispatch({ type: 'UPDATE_STATISTICS' });
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
      dispatch({ type: 'UPDATE_STATISTICS' });
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
      dispatch({ type: 'REFRESH_ALL' });
      dispatch({ type: 'UPDATE_STATISTICS' });
    }
    return result;
  }, []);

  const refreshData = useCallback(() => {
    dispatch({ type: 'REFRESH_ALL' });
    dispatch({ type: 'UPDATE_STATISTICS' });
  }, []);

  const value: LibraryContextType = {
    state,
    dispatch,
    addBook,
    updateBook,
    deleteBook,
    searchBooks,
    getBookByBarcode,
    addMember,
    updateMember,
    deleteMember,
    searchMembers,
    getMemberByCardNumber,
    borrowBook,
    returnBook,
    renewBook,
    getOverdueBorrows,
    addCategory,
    updateCategory,
    deleteCategory,
    updateSettings,
    exportData,
    importData,
    refreshData
  };

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
}

// Hook
export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
