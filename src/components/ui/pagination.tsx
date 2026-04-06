// Pagination Component - 分页组件
// 统一的分页UI组件，支持多种分页样式

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { calculatePageRange } from '@/services/pagination';

/**
 * 分页组件属性
 */
export interface PaginationProps {
  /** 当前页码 */
  page: number;
  /** 总页数 */
  totalPages: number;
  /** 总条数 */
  total: number;
  /** 每页条数 */
  pageSize: number;
  /** 每页条数选项 */
  pageSizeOptions?: number[];
  /** 页码变化回调 */
  onPageChange: (page: number) => void;
  /** 每页条数变化回调 */
  onPageSizeChange?: (pageSize: number) => void;
  /** 最大显示页码按钮数 */
  maxPageButtons?: number;
  /** 是否显示总条数 */
  showTotal?: boolean;
  /** 是否显示页码跳转 */
  showJumper?: boolean;
  /** 是否简洁模式 */
  simple?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否有上一页 */
  hasPrevious?: boolean;
  /** 是否有下一页 */
  hasNext?: boolean;
}

/**
 * 分页组件
 */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  maxPageButtons = 5,
  showTotal = true,
  showJumper = false,
  simple = false,
  className,
  hasPrevious,
  hasNext,
}: PaginationProps) {
  const prevDisabled = hasPrevious !== undefined ? !hasPrevious : page <= 1;
  const nextDisabled = hasNext !== undefined ? !hasNext : page >= totalPages;
  
  // 计算显示的页码
  const pageRange = calculatePageRange(page, totalPages, maxPageButtons);
  
  // 简洁模式
  if (simple) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={prevDisabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={nextDisabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }
  
  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4", className)}>
      {/* 左侧信息 */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {showTotal && (
          <span>
            共 <strong className="text-foreground">{total}</strong> 条
          </span>
        )}
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>每页</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>条</span>
          </div>
        )}
      </div>
      
      {/* 分页按钮 */}
      <div className="flex items-center gap-1">
        {/* 首页 */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex"
          onClick={() => onPageChange(1)}
          disabled={prevDisabled}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        {/* 上一页 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={prevDisabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* 页码 */}
        {pageRange.map((item, index) => (
          <React.Fragment key={index}>
            {item === '...' ? (
              <span className="px-2 text-muted-foreground">...</span>
            ) : (
              <Button
                variant={page === item ? "default" : "outline"}
                size="sm"
                className="min-w-[32px]"
                onClick={() => onPageChange(item as number)}
              >
                {item}
              </Button>
            )}
          </React.Fragment>
        ))}
        
        {/* 下一页 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={nextDisabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {/* 末页 */}
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex"
          onClick={() => onPageChange(totalPages)}
          disabled={nextDisabled}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* 页码跳转 */}
      {showJumper && (
        <div className="flex items-center gap-2 text-sm">
          <span>跳至</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            className="w-14 h-8 px-2 border rounded text-center"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = parseInt((e.target as HTMLInputElement).value);
                if (value >= 1 && value <= totalPages) {
                  onPageChange(value);
                }
              }
            }}
          />
          <span>页</span>
        </div>
      )}
    </div>
  );
}

/**
 * 迷你分页组件
 * 适用于卡片底部等紧凑空间
 */
export function MiniPagination({
  page,
  totalPages,
  onPageChange,
  hasPrevious,
  hasNext,
  className,
}: Omit<PaginationProps, 'total' | 'pageSize'>) {
  const prevDisabled = hasPrevious !== undefined ? !hasPrevious : page <= 1;
  const nextDisabled = hasNext !== undefined ? !hasNext : page >= totalPages;
  
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={prevDisabled}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        上一页
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={nextDisabled}
      >
        下一页
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

export default Pagination;
