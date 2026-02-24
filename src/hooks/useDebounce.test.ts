// useDebounce Hook 测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useThrottle } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 100));
    expect(result.current).toBe('test');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 100 } }
    );

    // 初始值
    expect(result.current).toBe('initial');

    // 改变值
    rerender({ value: 'updated', delay: 100 });
    
    // 立即检查，值不应该改变（还在防抖期内）
    expect(result.current).toBe('initial');

    // 快进时间
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // 现在值应该更新了
    expect(result.current).toBe('updated');
  });

  it('should cancel previous timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'v1', delay: 100 } }
    );

    // 快速改变多次
    rerender({ value: 'v2', delay: 100 });
    rerender({ value: 'v3', delay: 100 });
    rerender({ value: 'v4', delay: 100 });

    // 值应该还是初始值
    expect(result.current).toBe('v1');

    // 快进时间
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // 应该只反映最后一次改变
    expect(result.current).toBe('v4');
  });

  it('should use correct delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 200 } }
    );

    rerender({ value: 'updated', delay: 200 });

    // 100ms 后
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('test');

    // 200ms 后
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('updated');
  });
});

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useThrottle('test', 100));
    expect(result.current).toBe('test');
  });

  it('should throttle value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, interval }) => useThrottle(value, interval),
      { initialProps: { value: 'initial', interval: 100 } }
    );

    expect(result.current).toBe('initial');

    // 在节流期内改变值
    rerender({ value: 'updated', interval: 100 });
    
    // 50ms 后，值不应该改变
    act(() => {
      vi.advanceTimersByTime(50);
    });
    
    expect(result.current).toBe('initial');

    // 100ms 后，值应该更新
    act(() => {
      vi.advanceTimersByTime(50);
    });
    
    expect(result.current).toBe('updated');
  });

  it('should allow changes after interval', () => {
    const { result, rerender } = renderHook(
      ({ value, interval }) => useThrottle(value, interval),
      { initialProps: { value: 'v1', interval: 100 } }
    );

    // 等待节流期过去
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // 改变值
    rerender({ value: 'v2', interval: 100 });
    
    // 节流期后应该立即更新
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('v2');
  });
});
