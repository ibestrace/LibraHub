// Lazy Loading Utilities - 懒加载工具函数
// 提供带错误处理和加载状态的懒加载组件

import React, { Suspense } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 加载状态组件属性
 */
interface LoadingSpinnerProps {
  /** 自定义类名 */
  className?: string;
  /** 加载提示文字 */
  text?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 加载状态组件
 */
export function LoadingSpinner({ className, text = '加载中...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <p className="mt-4 text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

/**
 * 错误边界组件属性
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * 错误边界组件
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class LazyLoadErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('懒加载组件错误:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-destructive mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">组件加载失败</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || '请检查网络连接后重试'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 带 Suspense 和错误边界的懒加载包装器
 */
interface LazyComponentProps {
  children: ReactNode;
  /** 自定义加载组件 */
  loadingComponent?: ReactNode;
  /** 自定义错误组件 */
  errorComponent?: ReactNode;
  /** 加载提示文字 */
  loadingText?: string;
}

/**
 * 懒加载包装组件
 * 自动提供 Suspense 和 ErrorBoundary
 */
export function LazyComponent({
  children,
  loadingComponent,
  errorComponent,
  loadingText
}: LazyComponentProps) {
  return (
    <LazyLoadErrorBoundary fallback={errorComponent}>
      <Suspense fallback={loadingComponent || <LoadingSpinner text={loadingText} />}>
        {children}
      </Suspense>
    </LazyLoadErrorBoundary>
  );
}

/**
 * 创建懒加载组件的工厂函数
 * @param importFn - 动态导入函数
 * @param options - 配置选项
 * @returns 包装好的懒加载组件
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    loadingText?: string;
    loadingComponent?: ReactNode;
    errorComponent?: ReactNode;
  } = {}
) {
  const LazyComponentRaw = React.lazy(importFn);

  return function LazyWrappedComponent(props: React.ComponentProps<T>) {
    return (
      <LazyComponent
        loadingText={options.loadingText}
        loadingComponent={options.loadingComponent}
        errorComponent={options.errorComponent}
      >
        <LazyComponentRaw {...props} />
      </LazyComponent>
    );
  };
}

/**
 * 预加载组件
 * 用于提前加载可能需要的组件
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): Promise<{ default: T }> {
  return importFn();
}

/**
 * 延迟加载函数
 * 模拟网络延迟，用于测试加载状态
 */
export function delayImport<T>(
  importFn: () => Promise<T>,
  delayMs: number = 1000
): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(importFn());
    }, delayMs);
  });
}

// 导出便捷懒加载组件（已预配置）

// 书籍管理模块（延迟加载演示）
export const LazyBookManagement = createLazyComponent(
  () => import('@/sections/BookManagement'),
  { loadingText: '正在加载书籍管理...' }
);

// 会员管理模块
export const LazyMemberManagement = createLazyComponent(
  () => import('@/sections/MemberManagement'),
  { loadingText: '正在加载会员管理...' }
);

// 借阅归还模块
export const LazyBorrowReturn = createLazyComponent(
  () => import('@/sections/BorrowReturn'),
  { loadingText: '正在加载借阅归还...' }
);

// 数据管理模块
export const LazyDataManagement = createLazyComponent(
  () => import('@/sections/DataManagement'),
  { loadingText: '正在加载数据管理...' }
);

// 系统设置模块
export const LazySystemSettings = createLazyComponent(
  () => import('@/sections/SystemSettings'),
  { loadingText: '正在加载系统设置...' }
);

// 阅读排行模块
export const LazyReadingRanking = createLazyComponent(
  () => import('@/sections/ReadingRanking'),
  { loadingText: '正在加载阅读排行...' }
);

// 分组管理模块
export const LazyMemberGroupManagement = createLazyComponent(
  () => import('@/sections/MemberGroupManagement'),
  { loadingText: '正在加载分组管理...' }
);

// 数据概览模块
export const LazyDashboardOverview = createLazyComponent(
  () => import('@/sections/DashboardOverview'),
  { loadingText: '正在加载数据概览...' }
);
