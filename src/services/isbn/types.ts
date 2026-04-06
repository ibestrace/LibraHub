// ISBN 服务类型定义
import type { Book } from '@/types';

// 重试配置
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;  // 基础延迟（毫秒）
  maxDelay: number;   // 最大延迟（毫秒）
}

// API 配置
export interface ApiConfig {
  name: string;
  baseUrl: string;
  priority: number;
  enabled: boolean;
}

// ISBN 缓存条目
export interface IsbnCacheEntry {
  data: Partial<Book> | null;
  timestamp: number;
  source: string;
}

// OpenLibrary API 接口定义
export interface OpenLibraryBookInfo {
  title: string;
  subtitle?: string;
  authors: Array<{ name: string; url?: string }>;
  publishers?: string[];
  publish_date?: string;
  publish_year?: number;
  number_of_pages?: number;
  covers?: number[];
  description?: string | { type: string; value: string };
}

// Google Books API 接口定义
export interface GoogleBooksVolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
}

export interface GoogleBooksItem {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

export interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksItem[];
}

// 错误类型
export const ErrorTypes = {
  INVALID_ISBN: 'INVALID_ISBN',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorType = typeof ErrorTypes[keyof typeof ErrorTypes];

// ISBN 查询进度状态
export interface IsbnQueryProgress {
  /** 当前正在查询的数据源 */
  currentSource: string | null;
  /** 各数据源的状态 */
  sourceStatuses: Record<string, 'pending' | 'querying' | 'success' | 'failed' | 'timeout'>;
  /** 是否已完成 */
  isComplete: boolean;
  /** 成功的数据源 */
  successfulSource: string | null;
}

// 数据源健康统计
export interface DataSourceHealth {
  /** 数据源名称 */
  name: string;
  /** 总请求次数 */
  totalRequests: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 超时次数 */
  timeoutCount: number;
  /** 成功率 */
  successRate: number;
  /** 平均响应时间（ms） */
  avgResponseTime: number;
  /** 最后成功时间 */
  lastSuccessAt: number | null;
}
