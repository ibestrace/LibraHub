// Virtualized List Components - 虚拟化列表组件
// 使用 react-window v2 优化大数据量列表的渲染性能
// 支持书籍、会员、借阅记录等实体的虚拟化展示

import React, { useCallback, useMemo, useState } from 'react';
import { List } from 'react-window';
import type { CSSProperties, ReactElement } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Book, Member, BorrowRecord } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { BookOpen, Barcode, User, CreditCard, Calendar, Clock, BookMarked } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 虚拟化列表配置选项
 */
export interface VirtualizedListOptions {
  /** 列表高度 */
  height?: number;
  /** 每行高度 */
  itemHeight?: number;
  /** 列表宽度 */
  width?: number | string;
  /** 是否启用动态高度 */
  dynamicHeight?: boolean;
  /** 缓冲区大小（预渲染行数） */
  overscanCount?: number;
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<VirtualizedListOptions> = {
  height: 600,
  itemHeight: 72,
  width: '100%',
  dynamicHeight: false,
  overscanCount: 5
};

/**
 * 通用虚拟化列表组件属性
 */
interface VirtualizedListProps<T> {
  /** 数据列表 */
  items: T[];
  /** 渲染每一行的组件 */
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  /** 列表配置 */
  options?: VirtualizedListOptions;
  /** 是否加载中 */
  loading?: boolean;
  /** 加载中的占位数量 */
  loadingCount?: number;
  /** 空数据时的展示 */
  emptyComponent?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 行点击事件 */
  onItemClick?: (item: T, index: number) => void;
  /** 获取行的唯一键 */
  getItemKey?: (item: T, index: number) => string;
}

/**
 * 行数据类型（通过 rowProps 传递）
 */
interface RowDataProps<T> {
  items: T[];
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  onItemClick?: (item: T, index: number) => void;
  itemHeight: number;
}

/**
 * 行组件属性类型
 */
interface RowProps<T> {
  index: number;
  style: CSSProperties;
  items: T[];
  renderItem: (item: T, index: number, style: CSSProperties) => React.ReactNode;
  onItemClick?: (item: T, index: number) => void;
  itemHeight: number;
}

/**
 * 行渲染组件
 */
function VirtualizedRow<T>(props: RowProps<T>): ReactElement | null {
  const { index, style, items, renderItem, onItemClick, itemHeight } = props;
  const item = items[index];
  
  if (!item) return null;
  
  return (
    <div
      style={{
        ...style,
        top: `${parseFloat(style.top as string) + 8}px`,
        height: `${itemHeight - 8}px`
      }}
      className={cn(
        "px-2",
        onItemClick && "cursor-pointer hover:bg-accent/50 transition-colors"
      )}
      onClick={() => onItemClick?.(item, index)}
    >
      {renderItem(item, index, style)}
    </div>
  );
}

/**
 * 通用虚拟化列表组件
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  options = {},
  loading = false,
  loadingCount = 10,
  emptyComponent,
  className,
  onItemClick,
}: VirtualizedListProps<T>) {
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);

  // 加载状态显示骨架屏
  if (loading) {
    return (
      <div className={cn("space-y-2", className)} style={{ height: config.height }}>
        {Array.from({ length: loadingCount }).map((_, i) => (
          <Skeleton key={i} className="w-full" style={{ height: config.itemHeight }} />
        ))}
      </div>
    );
  }

  // 空数据状态
  if (items.length === 0 && emptyComponent) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height: config.height }}>
        {emptyComponent}
      </div>
    );
  }

  // 准备 rowProps
  const rowData: RowDataProps<T> = useMemo(() => ({
    items,
    renderItem,
    onItemClick,
    itemHeight: config.itemHeight
  }), [items, renderItem, onItemClick, config.itemHeight]);

  // 行渲染组件包装器
  const RowWrapper = useCallback((props: { index: number; style: CSSProperties }) => {
    return <VirtualizedRow {...props} {...rowData} />;
  }, [rowData]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <List
          rowComponent={RowWrapper as any}
          rowCount={items.length}
          rowHeight={config.itemHeight}
          rowProps={rowData as any}
          style={{ height: config.height, width: config.width }}
          overscanCount={config.overscanCount}
        />
      </CardContent>
    </Card>
  );
}

// ==================== 书籍列表虚拟化组件 ====================

/**
 * 书籍列表项属性
 */
interface BookListItemProps {
  book: Book;
  onClick?: (book: Book) => void;
  selected?: boolean;
}

/**
 * 书籍列表项组件
 */
export function BookListItem({ book, onClick, selected }: BookListItemProps) {
  const statusColors: Record<string, string> = {
    available: 'bg-green-500',
    borrowed: 'bg-blue-500',
    reserved: 'bg-yellow-500',
    damaged: 'bg-orange-500',
    lost: 'bg-red-500',
    under_repair: 'bg-gray-500'
  };

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border transition-all",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      )}
      onClick={() => onClick?.(book)}
    >
      <div className="relative">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-12 h-16 object-cover rounded"
          />
        ) : (
          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className={cn(
          "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
          statusColors[book.status] || 'bg-gray-500'
        )} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{book.title}</h4>
        <p className="text-sm text-muted-foreground truncate">
          {book.author} · {book.publisher}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            <Barcode className="w-3 h-3 mr-1" />
            {book.barcode}
          </Badge>
          <span className="text-xs text-muted-foreground">
            库存: {book.availableStock}/{book.totalStock}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 虚拟化书籍列表组件
 */
interface VirtualizedBookListProps {
  books: Book[];
  selectedIds?: Set<string>;
  onSelect?: (book: Book) => void;
  onItemClick?: (book: Book) => void;
  loading?: boolean;
  height?: number;
}

export function VirtualizedBookList({
  books,
  selectedIds,
  onSelect,
  onItemClick,
  loading,
  height = 600
}: VirtualizedBookListProps) {
  const renderBook = useCallback((book: Book) => {
    return (
      <BookListItem
        book={book}
        selected={selectedIds?.has(book.id)}
        onClick={() => {
          onSelect?.(book);
          onItemClick?.(book);
        }}
      />
    );
  }, [selectedIds, onSelect, onItemClick]);

  return (
    <VirtualizedList
      items={books}
      renderItem={renderBook}
      options={{ height, itemHeight: 88 }}
      loading={loading}
      onItemClick={(_, index) => {
        const book = books[index];
        if (book) {
          onSelect?.(book);
          onItemClick?.(book);
        }
      }}
      emptyComponent={
        <div className="text-center text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无书籍数据</p>
        </div>
      }
    />
  );
}

// ==================== 会员列表虚拟化组件 ====================

/**
 * 会员列表项组件
 */
interface MemberListItemProps {
  member: Member;
  onClick?: (member: Member) => void;
  selected?: boolean;
}

export function MemberListItem({ member, onClick, selected }: MemberListItemProps) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    expired: 'bg-yellow-500',
    suspended: 'bg-orange-500',
    cancelled: 'bg-red-500'
  };

  const initials = member.name.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border transition-all",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      )}
      onClick={() => onClick?.(member)}
    >
      <Avatar className="relative">
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
          statusColors[member.status] || 'bg-gray-500'
        )} />
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{member.name}</h4>
        <p className="text-sm text-muted-foreground truncate">
          {member.phone} · {member.memberType.name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            <CreditCard className="w-3 h-3 mr-1" />
            {member.cardNumber}
          </Badge>
          <span className="text-xs text-muted-foreground">
            借阅中: {member.currentBorrowCount}/{member.memberType.maxBorrowCount}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 虚拟化会员列表组件
 */
interface VirtualizedMemberListProps {
  members: Member[];
  selectedIds?: Set<string>;
  onSelect?: (member: Member) => void;
  onItemClick?: (member: Member) => void;
  loading?: boolean;
  height?: number;
}

export function VirtualizedMemberList({
  members,
  selectedIds,
  onSelect,
  onItemClick,
  loading,
  height = 600
}: VirtualizedMemberListProps) {
  const renderMember = useCallback((member: Member) => {
    return (
      <MemberListItem
        member={member}
        selected={selectedIds?.has(member.id)}
        onClick={() => {
          onSelect?.(member);
          onItemClick?.(member);
        }}
      />
    );
  }, [selectedIds, onSelect, onItemClick]);

  return (
    <VirtualizedList
      items={members}
      renderItem={renderMember}
      options={{ height, itemHeight: 88 }}
      loading={loading}
      onItemClick={(_, index) => {
        const member = members[index];
        if (member) {
          onSelect?.(member);
          onItemClick?.(member);
        }
      }}
      emptyComponent={
        <div className="text-center text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无会员数据</p>
        </div>
      }
    />
  );
}

// ==================== 借阅记录列表虚拟化组件 ====================

/**
 * 借阅记录列表项组件
 */
interface BorrowRecordListItemProps {
  record: BorrowRecord;
  onClick?: (record: BorrowRecord) => void;
  selected?: boolean;
}

export function BorrowRecordListItem({ record, onClick, selected }: BorrowRecordListItemProps) {
  const statusColors: Record<string, string> = {
    borrowed: 'bg-blue-500',
    returned: 'bg-green-500',
    overdue: 'bg-red-500',
    renewed: 'bg-yellow-500'
  };

  const isOverdue = record.status === 'overdue' || 
    (record.status === 'borrowed' && new Date(record.dueDate) < new Date());

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border transition-all",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        isOverdue && "border-red-300 bg-red-50/50"
      )}
      onClick={() => onClick?.(record)}
    >
      <div className="relative">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          statusColors[record.status] || 'bg-gray-500',
          "text-white"
        )}>
          <BookMarked className="w-5 h-5" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium truncate">{record.bookTitle}</h4>
          <Badge 
            variant={isOverdue ? "destructive" : "secondary"}
            className="text-xs shrink-0 ml-2"
          >
            {record.status === 'borrowed' && isOverdue ? '已逾期' : 
             record.status === 'borrowed' ? '借阅中' :
             record.status === 'returned' ? '已归还' :
             record.status === 'renewed' ? '已续借' : record.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {record.memberName} · {record.memberCardNumber}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            借: {format(new Date(record.borrowDate), 'MM/dd', { locale: zhCN })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            还: {format(new Date(record.dueDate), 'MM/dd', { locale: zhCN })}
          </span>
          {record.renewCount > 0 && (
            <Badge variant="outline" className="text-xs">
              续借 {record.renewCount} 次
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 虚拟化借阅记录列表组件
 */
interface VirtualizedBorrowRecordListProps {
  records: BorrowRecord[];
  selectedIds?: Set<string>;
  onSelect?: (record: BorrowRecord) => void;
  onItemClick?: (record: BorrowRecord) => void;
  loading?: boolean;
  height?: number;
}

export function VirtualizedBorrowRecordList({
  records,
  selectedIds,
  onSelect,
  onItemClick,
  loading,
  height = 600
}: VirtualizedBorrowRecordListProps) {
  const renderRecord = useCallback((record: BorrowRecord) => {
    return (
      <BorrowRecordListItem
        record={record}
        selected={selectedIds?.has(record.id)}
        onClick={() => {
          onSelect?.(record);
          onItemClick?.(record);
        }}
      />
    );
  }, [selectedIds, onSelect, onItemClick]);

  return (
    <VirtualizedList
      items={records}
      renderItem={renderRecord}
      options={{ height, itemHeight: 96 }}
      loading={loading}
      onItemClick={(_, index) => {
        const record = records[index];
        if (record) {
          onSelect?.(record);
          onItemClick?.(record);
        }
      }}
      emptyComponent={
        <div className="text-center text-muted-foreground">
          <BookMarked className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无借阅记录</p>
        </div>
      }
    />
  );
}

// ==================== 导出便捷 Hooks ====================

/**
 * 虚拟化列表选择 Hook
 */
export function useVirtualizedSelection<T extends { id: string }>(
  initialSelected: string[] = []
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelected));

  const toggleSelection = useCallback((item: T) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(item.id)) {
        newSet.delete(item.id);
      } else {
        newSet.add(item.id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds(new Set(items.map(item => item.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((item: T) => {
    return selectedIds.has(item.id);
  }, [selectedIds]);

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount: selectedIds.size
  };
}

// 导出默认组件
export default VirtualizedList;
