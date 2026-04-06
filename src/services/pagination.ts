// Pagination Service - 分页服务
// 提供统一的分页查询接口，支持内存分页和虚拟滚动

import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * 分页参数
 */
export interface PaginationParams {
  /** 当前页码 (从 1 开始) */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  /** 当前页数据 */
  data: T[];
  /** 总条数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有上一页 */
  hasPrevious: boolean;
  /** 是否有下一页 */
  hasNext: boolean;
}

/**
 * 分页配置
 */
export interface PaginationConfig {
  /** 默认页码 */
  defaultPage?: number;
  /** 默认每页条数 */
  defaultPageSize?: number;
  /** 可选的每页条数 */
  pageSizeOptions?: number[];
  /** 最大显示页码数 */
  maxPageButtons?: number;
}

/**
 * 默认分页配置
 */
const DEFAULT_CONFIG: Required<PaginationConfig> = {
  defaultPage: 1,
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],
  maxPageButtons: 5,
};

/**
 * 内存分页函数
 * 对数组进行分页处理
 */
export function paginate<T>(
  items: T[],
  params: PaginationParams
): PaginatedResult<T> {
  const { page, pageSize, sortBy, sortOrder } = params;
  
  // 排序
  let sortedItems = [...items];
  if (sortBy) {
    sortedItems.sort((a: any, b: any) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (aVal === bVal) return 0;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
  
  // 分页
  const total = sortedItems.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const data = sortedItems.slice(startIndex, endIndex);
  
  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
}

/**
 * React Hook: 使用分页
 */
export function usePagination<T>(
  items: T[],
  config: PaginationConfig = {}
) {
  const cfg = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  const [page, setPage] = useState(cfg.defaultPage);
  const [pageSize, setPageSize] = useState(cfg.defaultPageSize);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // 当 items 变化时重置到第一页
  useEffect(() => {
    setPage(cfg.defaultPage);
  }, [items.length, cfg.defaultPage]);
  
  // 计算分页结果
  const result = useMemo(() => {
    return paginate(items, { page, pageSize, sortBy, sortOrder });
  }, [items, page, pageSize, sortBy, sortOrder]);
  
  // 页码变化
  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, result.totalPages || 1)));
  }, [result.totalPages]);
  
  // 下一页
  const nextPage = useCallback(() => {
    if (result.hasNext) {
      setPage(p => p + 1);
    }
  }, [result.hasNext]);
  
  // 上一页
  const previousPage = useCallback(() => {
    if (result.hasPrevious) {
      setPage(p => p - 1);
    }
  }, [result.hasPrevious]);
  
  // 跳转到第一页
  const firstPage = useCallback(() => {
    setPage(1);
  }, []);
  
  // 跳转到最后一页
  const lastPage = useCallback(() => {
    setPage(result.totalPages || 1);
  }, [result.totalPages]);
  
  // 改变每页条数
  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // 重置到第一页
  }, []);
  
  // 排序
  const toggleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy]);
  
  // 重置
  const reset = useCallback(() => {
    setPage(cfg.defaultPage);
    setPageSize(cfg.defaultPageSize);
    setSortBy(undefined);
    setSortOrder('asc');
  }, [cfg.defaultPage, cfg.defaultPageSize]);
  
  return {
    ...result,
    pageSizeOptions: cfg.pageSizeOptions,
    maxPageButtons: cfg.maxPageButtons,
    sortBy,
    sortOrder,
    setPage: goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    changePageSize,
    toggleSort,
    reset,
  };
}

/**
 * 计算页码范围
 * 用于分页按钮显示
 */
export function calculatePageRange(
  currentPage: number,
  totalPages: number,
  maxButtons: number = 5
): (number | string)[] {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxButtons - 1);
  
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }
  
  const range: (number | string)[] = [];
  
  // 第一页
  if (start > 1) {
    range.push(1);
    if (start > 2) {
      range.push('...');
    }
  }
  
  // 中间页码
  for (let i = start; i <= end; i++) {
    range.push(i);
  }
  
  // 最后一页
  if (end < totalPages) {
    if (end < totalPages - 1) {
      range.push('...');
    }
    range.push(totalPages);
  }
  
  return range;
}

// ==================== 虚拟滚动分页 ====================

/**
 * 虚拟滚动分页参数
 */
export interface VirtualPaginationParams {
  /** 起始索引 */
  startIndex: number;
  /** 结束索引 */
  endIndex: number;
  /**  Overscan 数量 */
  overscan?: number;
}

/**
 * 虚拟滚动分页结果
 */
export interface VirtualPaginatedResult<T> {
  /** 可见数据 */
  visibleData: T[];
  /** 起始索引 */
  startIndex: number;
  /** 结束索引 */
  endIndex: number;
  /** 总条数 */
  total: number;
  /** 虚拟总高度 */
  totalHeight: number;
  /** 偏移量 */
  offset: number;
}

/**
 * 虚拟滚动分页
 * 适用于大数据列表的虚拟滚动
 */
export function virtualPaginate<T>(
  items: T[],
  params: VirtualPaginationParams,
  itemHeight: number
): VirtualPaginatedResult<T> {
  const { startIndex, endIndex, overscan = 5 } = params;
  
  const total = items.length;
  const overscanStart = Math.max(0, startIndex - overscan);
  const overscanEnd = Math.min(total, endIndex + overscan);
  
  const visibleData = items.slice(overscanStart, overscanEnd);
  const totalHeight = total * itemHeight;
  const offset = overscanStart * itemHeight;
  
  return {
    visibleData,
    startIndex: overscanStart,
    endIndex: overscanEnd,
    total,
    totalHeight,
    offset,
  };
}

/**
 * React Hook: 使用虚拟滚动分页
 */
export function useVirtualPagination<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const result = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount, items.length);
    
    return virtualPaginate(
      items,
      { startIndex, endIndex, overscan },
      itemHeight
    );
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    ...result,
    scrollTop,
    handleScroll,
  };
}

// ==================== 光标分页 (适用于实时数据) ====================

/**
 * 光标分页参数
 */
export interface CursorPaginationParams {
  /** 每页条数 */
  limit: number;
  /** 上一页光标 */
  before?: string;
  /** 下一页光标 */
  after?: string;
}

/**
 * 光标分页结果
 */
export interface CursorPaginatedResult<T> {
  /** 数据 */
  data: T[];
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrevious: boolean;
  /** 下一页光标 */
  nextCursor?: string;
  /** 上一页光标 */
  previousCursor?: string;
}

/**
 * 光标分页 (适用于实时更新的数据)
 */
export function cursorPaginate<T extends { id: string }>(
  items: T[],
  params: CursorPaginationParams
): CursorPaginatedResult<T> {
  const { limit, before, after } = params;
  
  let startIndex = 0;
  let endIndex = limit;
  
  if (after) {
    const index = items.findIndex(item => item.id === after);
    if (index !== -1) {
      startIndex = index + 1;
      endIndex = startIndex + limit;
    }
  } else if (before) {
    const index = items.findIndex(item => item.id === before);
    if (index !== -1) {
      endIndex = index;
      startIndex = Math.max(0, endIndex - limit);
    }
  }
  
  const data = items.slice(startIndex, endIndex);
  const hasNext = endIndex < items.length;
  const hasPrevious = startIndex > 0;
  
  return {
    data,
    hasNext,
    hasPrevious,
    nextCursor: hasNext ? data[data.length - 1]?.id : undefined,
    previousCursor: hasPrevious ? items[startIndex - 1]?.id : undefined,
  };
}

// 导出默认对象
export default {
  paginate,
  usePagination,
  calculatePageRange,
  virtualPaginate,
  useVirtualPagination,
  cursorPaginate,
};
