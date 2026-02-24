// useStorageMonitor Hook 测试
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStorageMonitor } from './useStorageMonitor';

describe('useStorageMonitor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with stats', () => {
    const { result } = renderHook(() => useStorageMonitor());
    
    // 初始时 stats 应该存在
    expect(result.current.stats).toBeDefined();
    expect(result.current.formatSize).toBeDefined();
    expect(result.current.formatLimit).toBeDefined();
  });

  it('should format size correctly', () => {
    const { result } = renderHook(() => useStorageMonitor());
    
    expect(result.current.formatSize(0)).toBe('0 B');
    expect(result.current.formatSize(500)).toBe('500 B');
    expect(result.current.formatSize(1024)).toBe('1.00 KB');
    expect(result.current.formatSize(1536)).toBe('1.50 KB');
    expect(result.current.formatSize(1024 * 1024)).toBe('1.00 MB');
  });

  it('should provide warning color', () => {
    const { result } = renderHook(() => useStorageMonitor());
    
    expect(result.current.getWarningColor('critical')).toContain('text-red-700');
    expect(result.current.getWarningColor('high')).toContain('text-orange-700');
    expect(result.current.getWarningColor('medium')).toContain('text-yellow-700');
    expect(result.current.getWarningColor('low')).toContain('text-blue-700');
    expect(result.current.getWarningColor(null)).toContain('text-green-700');
  });

  it('should provide warning icon', () => {
    const { result } = renderHook(() => useStorageMonitor());
    
    expect(result.current.getWarningIcon('critical')).toBe('🚨');
    expect(result.current.getWarningIcon('high')).toBe('⚠️');
    expect(result.current.getWarningIcon('medium')).toBe('⚡');
    expect(result.current.getWarningIcon('low')).toBe('ℹ️');
    expect(result.current.getWarningIcon(null)).toBe('✅');
  });

  it('should provide warning message', () => {
    const { result } = renderHook(() => useStorageMonitor());
    
    expect(result.current.getWarningMessage('critical')).toContain('即将耗尽');
    expect(result.current.getWarningMessage('high')).toContain('紧张');
    expect(result.current.getWarningMessage('medium')).toContain('过半');
    expect(result.current.getWarningMessage('low')).toContain('正常');
    expect(result.current.getWarningMessage(null)).toContain('充足');
  });

  it('should format limit correctly', () => {
    const { result } = renderHook(() => useStorageMonitor());
    
    const limit = result.current.formatLimit();
    expect(limit).toBe('5.00 MB');
  });

  it('should have refresh function', () => {
    const { result } = renderHook(() => useStorageMonitor());
    
    expect(result.current.refresh).toBeDefined();
    expect(typeof result.current.refresh).toBe('function');
  });
});
