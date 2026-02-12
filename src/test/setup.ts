import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// 模拟 localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// 清理测试环境
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// 重置 localStorage 模拟
beforeEach(() => {
  localStorageMock.getItem.mockReturnValue(null)
})
