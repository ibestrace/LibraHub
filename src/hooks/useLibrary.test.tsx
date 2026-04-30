import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { LibraryProvider, useLibrary } from './useLibrary'
import type { ReactNode } from 'react'

// 模拟 localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockLocalStorage.store[key]
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store = {}
  }),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// 包装函数，提供 Provider
function wrapper({ children }: { children: ReactNode }) {
  return <LibraryProvider>{children}</LibraryProvider>
}

describe('useLibrary Hook', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
  })

  it('应该正确初始化状态', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })
    
    await waitFor(() => {
      expect(result.current.state.books).toEqual([])
      expect(result.current.state.members).toEqual([])
      expect(result.current.state.loading).toBe(false)
      expect(result.current.state.error).toBeNull()
    })
  })

  it('应该正确添加书籍', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })
    
    await act(async () => {
      await result.current.addBook({
        barcode: 'B001',
        isbn: '111',
        title: 'Test Book',
        author: 'Author',
        publisher: 'Publisher',
        categoryId: 'cat_1',
        totalStock: 5,
        availableStock: 5,
        status: 'available',
      })
    })
    
    expect(result.current.state.books).toHaveLength(1)
    expect(result.current.state.books[0].title).toBe('Test Book')
    expect(result.current.statistics.totalBooks).toBe(1)
  })

  it('应该正确更新书籍', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })
    
    let bookId: string
    
    await act(async () => {
      const book = await result.current.addBook({
        barcode: 'B001',
        isbn: '111',
        title: 'Original Title',
        author: 'Author',
        publisher: 'Publisher',
        categoryId: 'cat_1',
        totalStock: 5,
        availableStock: 5,
        status: 'available',
      })
      bookId = book.id
    })
    
    await act(async () => {
      await result.current.updateBook(bookId, { title: 'Updated Title' })
    })
    
    expect(result.current.state.books[0].title).toBe('Updated Title')
  })

  it('应该正确删除书籍', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })
    
    let bookId: string
    
    await act(async () => {
      const book = await result.current.addBook({
        barcode: 'B001',
        isbn: '111',
        title: 'Test Book',
        author: 'Author',
        publisher: 'Publisher',
        categoryId: 'cat_1',
        totalStock: 5,
        availableStock: 5,
        status: 'available',
      })
      bookId = book.id
    })
    
    await act(async () => {
      await result.current.deleteBook(bookId)
    })
    
    expect(result.current.state.books).toHaveLength(0)
    expect(result.current.statistics.totalBooks).toBe(0)
  })

  it('应该正确搜索书籍', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })
    
    await act(async () => {
      await result.current.addBook({
        barcode: 'B001',
        isbn: '111',
        title: 'JavaScript Guide',
        author: 'John',
        publisher: 'Publisher',
        categoryId: 'cat_1',
        totalStock: 5,
        availableStock: 5,
        status: 'available',
      })
      await result.current.addBook({
        barcode: 'B002',
        isbn: '222',
        title: 'React Patterns',
        author: 'Jane',
        publisher: 'Publisher',
        categoryId: 'cat_2',
        totalStock: 5,
        availableStock: 5,
        status: 'available',
      })
    })
    
    const searchResults = result.current.searchBooks({ keyword: 'React' })
    
    expect(searchResults).toHaveLength(1)
    expect(searchResults[0].title).toBe('React Patterns')
  })

  it('应该正确添加会员', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })
    
    await act(async () => {
      await result.current.addMember({
        cardNumber: 'M001',
        name: '张三',
        phone: '13800138000',
        memberType: {
          id: 'type_1',
          name: '普通会员',
          durationMonths: 12,
          maxBorrowCount: 5,
          maxBorrowDays: 30,
          renewTimes: 2,
          renewDays: 15,
          depositAmount: 100,
          fee: 50,
          description: '普通会员',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        status: 'active',
        registerDate: new Date().toISOString(),
        expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxBorrowCount: 5,
      })
    })
    
    expect(result.current.state.members).toHaveLength(1)
    expect(result.current.state.members[0].name).toBe('张三')
    expect(result.current.statistics.totalMembers).toBe(1)
  })

  it('应该正确处理借书流程', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })
    
    let bookId: string
    let memberId: string
    
    await act(async () => {
      const book = await result.current.addBook({
        barcode: 'B001',
        isbn: '111',
        title: 'Test Book',
        author: 'Author',
        publisher: 'Publisher',
        categoryId: 'cat_1',
        totalStock: 3,
        availableStock: 3,
        status: 'available',
      })
      bookId = book.id
      
      const member = await result.current.addMember({
        cardNumber: 'M001',
        name: '张三',
        phone: '13800138000',
        memberType: {
          id: 'type_1',
          name: '普通会员',
          durationMonths: 12,
          maxBorrowCount: 5,
          maxBorrowDays: 30,
          renewTimes: 2,
          renewDays: 15,
          depositAmount: 100,
          fee: 50,
          description: '普通会员',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        status: 'active',
        registerDate: new Date().toISOString(),
        expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxBorrowCount: 5,
      })
      memberId = member.id
    })
    
    await act(async () => {
      await result.current.borrowBook({
        bookId,
        memberId,
        operator: 'admin',
      })
    })
    
    expect(result.current.state.borrowRecords).toHaveLength(1)
    expect(result.current.state.borrowRecords[0].status).toBe('borrowed')
    expect(result.current.statistics.currentBorrows).toBe(1)
    
    // 验证库存更新
    const book = result.current.state.books.find(b => b.id === bookId)
    expect(book?.availableStock).toBe(2)
    
    // 验证会员借阅数量更新
    const member = result.current.state.members.find(m => m.id === memberId)
    expect(member?.currentBorrowCount).toBe(1)
  })

  it('应该正确处理还书流程', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })
    
    let bookId: string
    let memberId: string
    let recordId: string
    
    await act(async () => {
      const book = await result.current.addBook({
        barcode: 'B001',
        isbn: '111',
        title: 'Test Book',
        author: 'Author',
        publisher: 'Publisher',
        categoryId: 'cat_1',
        totalStock: 3,
        availableStock: 3,
        status: 'available',
      })
      bookId = book.id
      
      const member = await result.current.addMember({
        cardNumber: 'M001',
        name: '张三',
        phone: '13800138000',
        memberType: {
          id: 'type_1',
          name: '普通会员',
          durationMonths: 12,
          maxBorrowCount: 5,
          maxBorrowDays: 30,
          renewTimes: 2,
          renewDays: 15,
          depositAmount: 100,
          fee: 50,
          description: '普通会员',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        status: 'active',
        registerDate: new Date().toISOString(),
        expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxBorrowCount: 5,
      })
      memberId = member.id
      
      const record = await result.current.borrowBook({
        bookId,
        memberId,
        operator: 'admin',
      })
      recordId = record.id
    })
    
    await act(async () => {
      await result.current.returnBook({
        recordId,
        operator: 'admin',
      })
    })
    
    expect(result.current.state.borrowRecords[0].status).toBe('returned')
    expect(result.current.state.borrowRecords[0].returnDate).toBeDefined()
    
    // 验证库存恢复
    const book = result.current.state.books.find(b => b.id === bookId)
    expect(book?.availableStock).toBe(3)
    
    // 验证会员借阅数量减少
    const member = result.current.state.members.find(m => m.id === memberId)
    expect(member?.currentBorrowCount).toBe(0)
  })

  it('应该正确更新设置', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })
    
    await act(async () => {
      await result.current.updateSettings({
        libraryName: '新图书馆名称',
        overdueFinePerDay: 2,
      })
    })
    
    expect(result.current.state.settings.libraryName).toBe('新图书馆名称')
    expect(result.current.state.settings.overdueFinePerDay).toBe(2)
  })

  it('应该正确导出和导入数据', async () => {
    const { result } = renderHook(() => useLibrary(), { wrapper })
    
    // 添加一些数据
    await act(async () => {
      await result.current.addBook({
        barcode: 'B001',
        isbn: '111',
        title: 'Test Book',
        author: 'Author',
        publisher: 'Publisher',
        categoryId: 'cat_1',
        totalStock: 3,
        availableStock: 3,
        status: 'available',
      })
    })
    
    // 导出数据
    let exportedData: string
    await act(() => {
      exportedData = result.current.exportData()
    })
    
    expect(exportedData!).toBeDefined()
    const parsed = JSON.parse(exportedData!)
    expect(parsed.books).toHaveLength(1)
    expect(parsed.version).toBe('1.0')
    
    // 清除数据
    mockLocalStorage.clear()
    
    // 导入数据
    await act(() => {
      result.current.importData(exportedData!)
    })
    
    expect(result.current.state.books).toHaveLength(1)
  })

  it('应该在 Provider 外使用时报错', () => {
    // 抑制控制台错误
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      renderHook(() => useLibrary())
    }).toThrow('useLibrary must be used within a LibraryProvider')
    
    consoleError.mockRestore()
  })
})
