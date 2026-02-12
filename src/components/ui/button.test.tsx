import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './button'

describe('Button Component', () => {
  it('应该正确渲染按钮文本', () => {
    render(<Button>点击我</Button>)
    expect(screen.getByText('点击我')).toBeInTheDocument()
  })

  it('应该响应点击事件', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>点击我</Button>)
    
    fireEvent.click(screen.getByText('点击我'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('应该在 disabled 时不响应点击', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick} disabled>点击我</Button>)
    
    fireEvent.click(screen.getByText('点击我'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('应该应用变体样式', () => {
    const { rerender } = render(<Button variant="default">默认</Button>)
    expect(screen.getByText('默认')).toBeInTheDocument()
    
    rerender(<Button variant="destructive">危险</Button>)
    expect(screen.getByText('危险')).toBeInTheDocument()
    
    rerender(<Button variant="outline">轮廓</Button>)
    expect(screen.getByText('轮廓')).toBeInTheDocument()
    
    rerender(<Button variant="ghost">幽灵</Button>)
    expect(screen.getByText('幽灵')).toBeInTheDocument()
    
    rerender(<Button variant="link">链接</Button>)
    expect(screen.getByText('链接')).toBeInTheDocument()
  })

  it('应该应用尺寸样式', () => {
    const { rerender } = render(<Button size="default">默认</Button>)
    expect(screen.getByText('默认')).toBeInTheDocument()
    
    rerender(<Button size="sm">小</Button>)
    expect(screen.getByText('小')).toBeInTheDocument()
    
    rerender(<Button size="lg">大</Button>)
    expect(screen.getByText('大')).toBeInTheDocument()
    
    rerender(<Button size="icon">图</Button>)
    expect(screen.getByText('图')).toBeInTheDocument()
  })
})
