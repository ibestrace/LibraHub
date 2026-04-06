import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  StorageService,
  StorageAdapter,
  STORES,
  BookService,
  MemberService,
  MemberTypeService,
  BorrowService,
  SettingsService,
} from './storage'

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

// 模拟 IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
}

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

describe('StorageService', () => {
  beforeEach(async () => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
    // 使用 localStorage 模式进行测试
    StorageAdapter.setBackend('localStorage')
    await StorageAdapter.init()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确存储和读取数据', async () => {
    const data = { name: 'test', value: 123 }
    await StorageService.set('test_key', data)

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'test_key',
      JSON.stringify(data)
    )
  })

  it('应该返回默认值当键不存在时', async () => {
    const defaultValue = { default: true }
    const result = await StorageService.get('nonexistent_key', defaultValue)

    expect(result).toEqual(defaultValue)
  })

  it('应该正确导出所有数据', async () => {
    const books = [{ id: '1', title: 'Test Book' }]
    await StorageService.set('library_books', books)

    const exported = await StorageService.exportAll()
    const parsed = JSON.parse(exported)

    expect(parsed.version).toBe('1.0')
    expect(parsed.books).toEqual(books)
    expect(parsed.exportTime).toBeDefined()
  })

  it('应该正确导入数据', async () => {
    const data = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      books: [{ id: '1', title: 'Test Book' }],
      members: [],
      memberTypes: [],
      borrowRecords: [],
      reservations: [],
      categories: [],
      logs: [],
      settings: {},
    }

    const result = await StorageService.importAll(JSON.stringify(data))

    expect(result).toBe(true)
  })
})

describe('BookService', () => {
  beforeEach(async () => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
    StorageAdapter.setBackend('localStorage')
    await StorageAdapter.init()
  })

  it('应该添加新书', async () => {
    const newBook = {
      barcode: '123456',
      isbn: '978-3-16-148410-0',
      title: 'Test Book',
      author: 'Test Author',
      publisher: 'Test Publisher',
      categoryId: 'cat_1',
      totalStock: 5,
      availableStock: 5,
      status: 'available' as const,
    }

    const book = await BookService.add(newBook)

    expect(book.id).toBeDefined()
    expect(book.title).toBe('Test Book')
    expect(book.borrowCount).toBe(0)
    expect(book.createdAt).toBeDefined()
  })

  it('应该抛出错误当条形码重复时', async () => {
    const book1 = {
      barcode: '123456',
      isbn: '978-1',
      title: 'Book 1',
      author: 'Author 1',
      publisher: 'Publisher',
      categoryId: 'cat_1',
      totalStock: 1,
      availableStock: 1,
      status: 'available' as const,
    }

    await BookService.add(book1)

    await expect(BookService.add(book1)).rejects.toThrow('条形码已存在')
  })

  it('应该正确搜索书籍', async () => {
    const books = [
      { barcode: '001', isbn: '111', title: 'JavaScript Guide', author: 'John', publisher: 'A', categoryId: 'cat_1', totalStock: 1, availableStock: 1, status: 'available' as const },
      { barcode: '002', isbn: '222', title: 'React Patterns', author: 'Jane', publisher: 'B', categoryId: 'cat_2', totalStock: 1, availableStock: 1, status: 'available' as const },
      { barcode: '003', isbn: '333', title: 'TypeScript Deep', author: 'Bob', publisher: 'C', categoryId: 'cat_1', totalStock: 1, availableStock: 0, status: 'borrowed' as const },
    ]

    for (const book of books) {
      await BookService.add(book)
    }

    // 关键词搜索
    const results = await BookService.search({ keyword: 'React' })
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('React Patterns')

    // 分类筛选
    const catResults = await BookService.search({ categoryId: 'cat_1' })
    expect(catResults).toHaveLength(2)

    // 状态筛选
    const statusResults = await BookService.search({ status: 'borrowed' })
    expect(statusResults).toHaveLength(1)
  })

  it('应该正确更新书籍', async () => {
    const book = await BookService.add({
      barcode: '001',
      isbn: '111',
      title: 'Original Title',
      author: 'Author',
      publisher: 'Publisher',
      categoryId: 'cat_1',
      totalStock: 1,
      availableStock: 1,
      status: 'available' as const,
    })

    // 等待一小段时间确保时间戳不同
    await new Promise(resolve => setTimeout(resolve, 10))

    const updated = await BookService.update(book.id, { title: 'Updated Title' })

    expect(updated?.title).toBe('Updated Title')
    expect(updated?.updatedAt).not.toBe(book.createdAt)
  })

  it('应该正确删除书籍', async () => {
    const book = await BookService.add({
      barcode: '001',
      isbn: '111',
      title: 'Test Book',
      author: 'Author',
      publisher: 'Publisher',
      categoryId: 'cat_1',
      totalStock: 1,
      availableStock: 1,
      status: 'available' as const,
    })

    const result = await BookService.delete(book.id)

    expect(result).toBe(true)
    const found = await BookService.getById(book.id)
    expect(found).toBeUndefined()
  })

  it('应该返回正确的统计数据', async () => {
    await BookService.add({
      barcode: '001', isbn: '111', title: 'Book 1', author: 'A1', publisher: 'P', categoryId: 'cat_1', totalStock: 1, availableStock: 1, status: 'available' as const,
    })
    await BookService.add({
      barcode: '002', isbn: '222', title: 'Book 2', author: 'A2', publisher: 'P', categoryId: 'cat_1', totalStock: 1, availableStock: 0, status: 'borrowed' as const,
    })

    const stats = await BookService.getStats()

    expect(stats.total).toBe(2)
    expect(stats.available).toBe(1)
    expect(stats.borrowed).toBe(1)
  })
})

describe('MemberService', () => {
  beforeEach(async () => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
    StorageAdapter.setBackend('localStorage')
    await StorageAdapter.init()
  })

  it('应该添加新会员', async () => {
    const memberTypes = await MemberTypeService.getAll()
    const memberType = memberTypes[0]
    const newMember = {
      cardNumber: 'M001',
      name: '张三',
      phone: '13800138000',
      memberType,
      status: 'active' as const,
      registerDate: new Date().toISOString(),
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxBorrowCount: memberType.maxBorrowCount,
    }

    const member = await MemberService.add(newMember)

    expect(member.id).toBeDefined()
    expect(member.name).toBe('张三')
    expect(member.currentBorrowCount).toBe(0)
  })

  it('应该正确搜索会员', async () => {
    const memberTypes = await MemberTypeService.getAll()
    const memberType = memberTypes[0]

    await MemberService.add({
      cardNumber: 'M001',
      name: '张三',
      phone: '13800138000',
      memberType,
      status: 'active' as const,
      registerDate: new Date().toISOString(),
      expireDate: new Date().toISOString(),
      maxBorrowCount: 5,
    })

    await MemberService.add({
      cardNumber: 'M002',
      name: '李四',
      phone: '13900139000',
      memberType,
      status: 'expired' as const,
      registerDate: new Date().toISOString(),
      expireDate: new Date().toISOString(),
      maxBorrowCount: 5,
    })

    const keywordResults = await MemberService.search({ keyword: '张三' })
    expect(keywordResults).toHaveLength(1)

    const statusResults = await MemberService.search({ status: 'expired' })
    expect(statusResults).toHaveLength(1)
  })
})

describe('BorrowService', () => {
  beforeEach(async () => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
    StorageAdapter.setBackend('localStorage')
    await StorageAdapter.init()
  })

  it('应该成功借书', async () => {
    // 准备数据
    const memberTypes = await MemberTypeService.getAll()
    const memberType = memberTypes[0]
    const member = await MemberService.add({
      cardNumber: 'M001',
      name: '张三',
      phone: '13800138000',
      memberType,
      status: 'active' as const,
      registerDate: new Date().toISOString(),
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxBorrowCount: 5,
    })

    const book = await BookService.add({
      barcode: 'B001',
      isbn: '111',
      title: 'Test Book',
      author: 'Author',
      publisher: 'Publisher',
      categoryId: 'cat_1',
      totalStock: 3,
      availableStock: 3,
      status: 'available' as const,
    })

    // 执行借书
    const record = await BorrowService.borrow({
      bookId: book.id,
      memberId: member.id,
      operator: 'admin',
    })

    expect(record.status).toBe('borrowed')
    expect(record.bookTitle).toBe('Test Book')
    expect(record.memberName).toBe('张三')
    expect(record.dueDate).toBeDefined()

    // 验证库存更新
    const updatedBook = await BookService.getById(book.id)
    expect(updatedBook?.availableStock).toBe(2)

    // 验证会员借阅数量更新
    const updatedMember = await MemberService.getById(member.id)
    expect(updatedMember?.currentBorrowCount).toBe(1)
  })

  it('应该在库存不足时抛出错误', async () => {
    const memberTypes = await MemberTypeService.getAll()
    const memberType = memberTypes[0]
    const member = await MemberService.add({
      cardNumber: 'M001',
      name: '张三',
      phone: '13800138000',
      memberType,
      status: 'active' as const,
      registerDate: new Date().toISOString(),
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxBorrowCount: 5,
    })

    const book = await BookService.add({
      barcode: 'B001',
      isbn: '111',
      title: 'Test Book',
      author: 'Author',
      publisher: 'Publisher',
      categoryId: 'cat_1',
      totalStock: 0,
      availableStock: 0,
      status: 'borrowed' as const,
    })

    await expect(BorrowService.borrow({
      bookId: book.id,
      memberId: member.id,
      operator: 'admin',
    })).rejects.toThrow('该书籍不可借阅')
  })

  it('应该在会员达到借阅上限时抛出错误', async () => {
    const memberTypes = await MemberTypeService.getAll()
    const memberType = memberTypes[0]
    const member = await MemberService.add({
      cardNumber: 'M001',
      name: '张三',
      phone: '13800138000',
      memberType,
      status: 'active' as const,
      registerDate: new Date().toISOString(),
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxBorrowCount: 5,
    })

    // 借满5本书
    for (let i = 0; i < 5; i++) {
      const book = await BookService.add({
        barcode: `B00${i + 10}`,
        isbn: `${i + 10}`,
        title: `Test Book ${i + 10}`,
        author: 'Author',
        publisher: 'Publisher',
        categoryId: 'cat_1',
        totalStock: 3,
        availableStock: 3,
        status: 'available' as const,
      })
      await BorrowService.borrow({
        bookId: book.id,
        memberId: member.id,
        operator: 'admin',
      })
    }

    const book1 = await BookService.add({
      barcode: 'B001',
      isbn: '111',
      title: 'Test Book 1',
      author: 'Author',
      publisher: 'Publisher',
      categoryId: 'cat_1',
      totalStock: 3,
      availableStock: 3,
      status: 'available' as const,
    })

    // 再借一本应该失败
    await expect(BorrowService.borrow({
      bookId: book1.id,
      memberId: member.id,
      operator: 'admin',
    })).rejects.toThrow('已达到最大借阅数量限制')
  })

  it('应该成功还书', async () => {
    const memberTypes = await MemberTypeService.getAll()
    const memberType = memberTypes[0]
    const member = await MemberService.add({
      cardNumber: 'M001',
      name: '张三',
      phone: '13800138000',
      memberType,
      status: 'active' as const,
      registerDate: new Date().toISOString(),
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxBorrowCount: 5,
    })

    const book = await BookService.add({
      barcode: 'B001',
      isbn: '111',
      title: 'Test Book',
      author: 'Author',
      publisher: 'Publisher',
      categoryId: 'cat_1',
      totalStock: 3,
      availableStock: 3,
      status: 'available' as const,
    })

    const record = await BorrowService.borrow({
      bookId: book.id,
      memberId: member.id,
      operator: 'admin',
    })

    // 还书
    const returned = await BorrowService.return({
      recordId: record.id,
      operator: 'admin',
    })

    expect(returned.status).toBe('returned')
    expect(returned.returnDate).toBeDefined()

    // 验证库存恢复
    const updatedBook = await BookService.getById(book.id)
    expect(updatedBook?.availableStock).toBe(3)

    // 验证会员借阅数量减少
    const updatedMember = await MemberService.getById(member.id)
    expect(updatedMember?.currentBorrowCount).toBe(0)
  })

  it('应该成功续借', async () => {
    const memberTypes = await MemberTypeService.getAll()
    const memberType = memberTypes[0]
    const member = await MemberService.add({
      cardNumber: 'M001',
      name: '张三',
      phone: '13800138000',
      memberType,
      status: 'active' as const,
      registerDate: new Date().toISOString(),
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxBorrowCount: 5,
    })

    const book = await BookService.add({
      barcode: 'B001',
      isbn: '111',
      title: 'Test Book',
      author: 'Author',
      publisher: 'Publisher',
      categoryId: 'cat_1',
      totalStock: 3,
      availableStock: 3,
      status: 'available' as const,
    })

    const record = await BorrowService.borrow({
      bookId: book.id,
      memberId: member.id,
      operator: 'admin',
    })

    const originalDueDate = new Date(record.dueDate)

    // 续借
    const renewed = await BorrowService.renew({
      recordId: record.id,
      operator: 'admin',
    })

    expect(renewed.status).toBe('renewed')
    expect(renewed.renewCount).toBe(1)

    const newDueDate = new Date(renewed.dueDate)
    expect(newDueDate.getTime()).toBeGreaterThan(originalDueDate.getTime())
  })

  it('应该在达到最大续借次数时抛出错误', async () => {
    // 直接测试续借次数限制逻辑
    // 创建一个只能续借0次的会员类型
    const noRenewType = await MemberTypeService.add({
      name: '不可续借会员',
      durationMonths: 12,
      maxBorrowCount: 5,
      maxBorrowDays: 30,
      renewTimes: 0, // 不能续借
      renewDays: 15,
      depositAmount: 100,
      fee: 50,
      description: '不可续借',
    })

    const member2 = await MemberService.add({
      cardNumber: 'M002',
      name: '李四',
      phone: '13900139000',
      memberType: noRenewType,
      status: 'active' as const,
      registerDate: new Date().toISOString(),
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxBorrowCount: 5,
    })

    const book2 = await BookService.add({
      barcode: 'B002',
      isbn: '222',
      title: 'Test Book 2',
      author: 'Author',
      publisher: 'Publisher',
      categoryId: 'cat_1',
      totalStock: 3,
      availableStock: 3,
      status: 'available' as const,
    })

    const record2 = await BorrowService.borrow({
      bookId: book2.id,
      memberId: member2.id,
      operator: 'admin',
    })

    // 续借应该失败（因为 renewTimes = 0）
    await expect(BorrowService.renew({
      recordId: record2.id,
      operator: 'admin',
    })).rejects.toThrow('已达到最大续借次数')
  })
})

describe('SettingsService', () => {
  beforeEach(async () => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
    StorageAdapter.setBackend('localStorage')
    await StorageAdapter.init()
  })

  it('应该返回默认设置', async () => {
    const settings = await SettingsService.get()

    expect(settings.libraryName).toBe('LibraHub 图书馆')
    expect(settings.maxBorrowDays).toBe(30)
    expect(settings.maxRenewTimes).toBe(2)
    expect(settings.overdueFinePerDay).toBe(1)
    expect(settings.allowOverdueBorrow).toBe(false)
  })

  it('应该正确更新设置', async () => {
    const updated = await SettingsService.update({
      libraryName: '新图书馆',
      overdueFinePerDay: 2,
    })

    expect(updated.libraryName).toBe('新图书馆')
    expect(updated.overdueFinePerDay).toBe(2)
    // 未修改的设置应保持原值
    expect(updated.maxBorrowDays).toBe(30)
  })
})
