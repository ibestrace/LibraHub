import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LibraryProvider } from '@/hooks/useLibrary'
import DashboardOverview from './DashboardOverview'

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

describe('DashboardOverview', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
  })

  it('应该渲染统计卡片', () => {
    render(
      <LibraryProvider>
        <DashboardOverview />
      </LibraryProvider>
    )
    
    expect(screen.getByText('总藏书量')).toBeInTheDocument()
    expect(screen.getByText('注册会员')).toBeInTheDocument()
    expect(screen.getByText('当前借出')).toBeInTheDocument()
    expect(screen.getByText('逾期未还')).toBeInTheDocument()
  })

  it('应该渲染今日动态', () => {
    render(
      <LibraryProvider>
        <DashboardOverview />
      </LibraryProvider>
    )
    
    expect(screen.getByText('今日动态')).toBeInTheDocument()
    expect(screen.getByText('今日借阅')).toBeInTheDocument()
    expect(screen.getByText('今日归还')).toBeInTheDocument()
    expect(screen.getByText('本月新会员')).toBeInTheDocument()
  })

  it('应该渲染系统信息', () => {
    render(
      <LibraryProvider>
        <DashboardOverview />
      </LibraryProvider>
    )
    
    expect(screen.getByText('系统信息')).toBeInTheDocument()
    expect(screen.getByText('当前时间')).toBeInTheDocument()
    expect(screen.getByText('系统状态')).toBeInTheDocument()
    expect(screen.getByText('图书馆名称')).toBeInTheDocument()
  })

  it('应该显示运行正常状态', () => {
    render(
      <LibraryProvider>
        <DashboardOverview />
      </LibraryProvider>
    )
    
    expect(screen.getByText('运行正常')).toBeInTheDocument()
    expect(screen.getByText('运行正常')).toHaveClass('text-emerald-600')
  })

  it('应该显示欢迎信息', () => {
    render(
      <LibraryProvider>
        <DashboardOverview />
      </LibraryProvider>
    )
    
    expect(screen.getByText('欢迎使用 LibraHub')).toBeInTheDocument()
    expect(screen.getByText(/智能图书管理系统/)).toBeInTheDocument()
  })
})
