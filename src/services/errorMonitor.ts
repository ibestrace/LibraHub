// Error Monitoring Service - 错误监控服务
// 捕获和报告应用错误，支持本地日志和远程上报

import React from 'react';

/**
 * 错误级别
 */
export type ErrorLevel = 'info' | 'warning' | 'error' | 'critical';

/**
 * 错误上下文
 */
export interface ErrorContext {
  /** 用户ID */
  userId?: string;
  /** 页面URL */
  url?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 额外数据 */
  extra?: Record<string, unknown>;
}

/**
 * 错误报告
 */
export interface ErrorReport {
  id: string;
  timestamp: string;
  level: ErrorLevel;
  message: string;
  stack?: string;
  source?: string;
  context: ErrorContext;
  resolved: boolean;
}

/**
 * 监控配置
 */
export interface MonitorConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 采样率 (0-1) */
  sampleRate: number;
  /** 最大存储错误数 */
  maxStoredErrors: number;
  /** 是否上报到远程 */
  reportToRemote: boolean;
  /** 远程上报URL */
  remoteUrl?: string;
  /** 环境 */
  environment: 'development' | 'production';
  /** 版本 */
  version?: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: MonitorConfig = {
  enabled: true,
  sampleRate: 1.0,
  maxStoredErrors: 100,
  reportToRemote: false,
  environment: 'production',
};

/**
 * 错误监控服务
 */
class ErrorMonitorService {
  private config: MonitorConfig;
  private initialized = false;
  private originalConsoleError: typeof console.error;
  private originalOnError: typeof window.onerror | null = null;
  private originalOnUnhandledRejection: typeof window.onunhandledrejection | null = null;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.originalConsoleError = console.error;
  }

  /**
   * 初始化监控
   */
  init(): void {
    if (this.initialized || !this.config.enabled) return;

    // 保存原始处理函数
    this.originalOnError = window.onerror;
    this.originalOnUnhandledRejection = window.onunhandledrejection;

    // 捕获全局错误
    window.onerror = this.handleGlobalError.bind(this);

    // 捕获未处理的 Promise 拒绝
    window.onunhandledrejection = this.handleUnhandledRejection.bind(this);

    // 拦截 console.error
    console.error = this.interceptConsoleError.bind(this);

    this.initialized = true;
    console.log('[ErrorMonitor] 初始化完成');
  }

  /**
   * 销毁监控
   */
  destroy(): void {
    if (!this.initialized) return;

    // 恢复原始处理函数
    window.onerror = this.originalOnError;
    window.onunhandledrejection = this.originalOnUnhandledRejection;
    console.error = this.originalConsoleError;

    this.initialized = false;
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 报告错误
   */
  async report(
    error: Error | string,
    level: ErrorLevel = 'error',
    context: Partial<ErrorContext> = {}
  ): Promise<void> {
    if (!this.config.enabled) return;

    // 采样率检查
    if (Math.random() > this.config.sampleRate) return;

    const errorMessage = error instanceof Error ? error.message : String(error);

    const report: ErrorReport = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context,
      },
      resolved: false,
    };

    // 存储到本地
    await this.storeError(report);

    // 上报到远程
    if (this.config.reportToRemote && this.config.remoteUrl) {
      this.reportToRemote(report);
    }

    // 严重错误立即提示
    if (level === 'critical') {
      this.showCriticalError(report);
    }
  }

  /**
   * 捕获 React 错误
   */
  captureReactError(error: Error, errorInfo: React.ErrorInfo): void {
    this.report(error, 'error', {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  /**
   * 处理全局错误
   */
  private handleGlobalError(
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): boolean {
    // 调用原始处理函数
    if (this.originalOnError) {
      this.originalOnError(message, source, lineno, colno, error);
    }

    const errorMessage = error?.message || String(message);

    this.report(error || errorMessage, 'error', {
      extra: {
        source,
        lineno,
        colno,
      },
    });

    return false; // 允许默认处理
  }

  /**
   * 处理未处理的 Promise 拒绝
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    // 调用原始处理函数
    if (this.originalOnUnhandledRejection) {
      this.originalOnUnhandledRejection(event);
    }

    const reason = event.reason;
    const error = reason instanceof Error ? reason : new Error(String(reason));

    this.report(error, 'error', {
      extra: {
        unhandledRejection: true,
      },
    });
  }

  /**
   * 拦截 console.error
   */
  private interceptConsoleError(...args: unknown[]): void {
    // 调用原始 console.error
    this.originalConsoleError.apply(console, args);

    // 检查是否是错误对象
    const errorArg = args.find(arg => arg instanceof Error);
    if (errorArg) {
      this.report(errorArg, 'warning');
    }
  }

  /**
   * 存储错误到本地
   */
  private async storeError(report: ErrorReport): Promise<void> {
    try {
      // 获取现有错误
      const errors = await this.getStoredErrors();
      
      // 添加新错误
      errors.push(report);
      
      // 限制数量
      if (errors.length > this.config.maxStoredErrors) {
        errors.shift(); // 移除最旧的
      }
      
      // 保存到存储
      localStorage.setItem('error_monitor_logs', JSON.stringify(errors));
    } catch (error) {
      console.error('[ErrorMonitor] 存储错误失败:', error);
    }
  }

  /**
   * 获取存储的错误
   */
  async getStoredErrors(): Promise<ErrorReport[]> {
    try {
      const data = localStorage.getItem('error_monitor_logs');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * 上报到远程
   */
  private async reportToRemote(report: ErrorReport): Promise<void> {
    if (!this.config.remoteUrl) return;

    try {
      await fetch(this.config.remoteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...report,
          environment: this.config.environment,
          version: this.config.version,
        }),
        // 使用 keepalive 确保页面关闭时也能发送
        keepalive: true,
      });
    } catch (error) {
      console.error('[ErrorMonitor] 远程上报失败:', error);
    }
  }

  /**
   * 显示严重错误提示
   */
  private showCriticalError(report: ErrorReport): void {
    // 创建错误提示元素
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc2626;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 9999;
      max-width: 400px;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    div.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">⚠️ 发生严重错误</div>
      <div style="font-size: 14px; margin-bottom: 8px;">${report.message}</div>
      <div style="font-size: 12px; opacity: 0.8;">请刷新页面或联系管理员</div>
      <button style="
        margin-top: 8px;
        padding: 4px 12px;
        background: rgba(255,255,255,0.2);
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
      " onclick="this.parentElement.remove()">关闭</button>
    `;
    document.body.appendChild(div);

    // 5秒后自动移除
    setTimeout(() => div.remove(), 5000);
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清除已解决的错误
   */
  async clearResolvedErrors(): Promise<void> {
    const errors = await this.getStoredErrors();
    const unresolved = errors.filter(e => !e.resolved);
    localStorage.setItem('error_monitor_logs', JSON.stringify(unresolved));
  }

  /**
   * 导出错误日志
   */
  async exportErrors(): Promise<string> {
    const errors = await this.getStoredErrors();
    return JSON.stringify({
      exportTime: new Date().toISOString(),
      environment: this.config.environment,
      version: this.config.version,
      errors,
    }, null, 2);
  }
}

// 导出单例
export const errorMonitor = new ErrorMonitorService();

// 导出便捷函数
export function initErrorMonitor(config?: Partial<MonitorConfig>): void {
  errorMonitor.setConfig(config || {});
  errorMonitor.init();
}

export function reportError(
  error: Error | string,
  level?: ErrorLevel,
  context?: Partial<ErrorContext>
): void {
  errorMonitor.report(error, level, context);
}

// React Error Boundary 高阶组件
export function withErrorMonitoring<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return class ErrorBoundary extends React.Component<P, { hasError: boolean }> {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
      return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      errorMonitor.captureReactError(error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return React.createElement('div', {
          style: {
            padding: '20px',
            textAlign: 'center',
            color: '#666',
          },
        }, [
          React.createElement('h3', { key: 'title' }, '组件加载失败'),
          React.createElement('p', { key: 'desc' }, '请刷新页面重试'),
        ]);
      }

      return React.createElement(Component, this.props);
    }
  };
}

// 类型定义补充
declare global {
  interface Window {
    onerror: ((
      message: string | Event,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => boolean | void) | null;
    onunhandledrejection: ((event: PromiseRejectionEvent) => void) | null;
  }
}
