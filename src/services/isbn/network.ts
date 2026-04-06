// 网络请求工具
import type { RetryConfig } from './types';

// API 超时配置（毫秒）
export const API_TIMEOUT = 5000;

// 默认重试配置：指数退避 1s, 2s, 4s
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 4000,
};

/**
 * 检测当前运行环境
 * @returns 'browser' | 'node' | 'test'
 */
export function detectEnvironment(): 'browser' | 'node' | 'test' {
  // Vitest 环境检测（使用 import.meta.env）
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (import.meta as any);
    if (meta?.env?.VITEST === 'true') {
      return 'test';
    }
  } catch {
    // import.meta 可能不存在
  }
  // 浏览器环境检测
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }
  // Node.js 环境
  return 'node';
}

/**
 * 带重试机制的 fetch 请求
 * @param url 请求 URL
 * @param options fetch 选项
 * @param retryConfig 重试配置
 * @returns fetch Response
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      // 成功响应
      if (response.ok) {
        return response;
      }
      
      // 服务器错误（5xx）可以重试
      if (response.status >= 500 && attempt < retryConfig.maxRetries) {
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(2, attempt),
          retryConfig.maxDelay
        );
        console.warn(`[ISBN] 请求失败 (${response.status})，${delay}ms 后重试 (第 ${attempt + 1} 次)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // 其他错误直接返回
      return response;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retryConfig.maxRetries) {
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(2, attempt),
          retryConfig.maxDelay
        );
        const errorName = lastError.name || 'Unknown';
        console.warn(`[ISBN] 请求异常 (${errorName})，${delay}ms 后重试 (第 ${attempt + 1} 次)`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 所有重试都失败
  throw lastError || new Error('请求失败，已达到最大重试次数');
}

/**
 * 获取 NLC API 的基础 URL
 * - 浏览器环境（Vite dev server）：使用代理路径 /api/nlc
 * - 测试/生产环境：直接使用完整 URL
 */
export function getNlcBaseUrl(): string {
  const env = detectEnvironment();
  if (env === 'browser') {
    // Vite 开发服务器代理路径
    return '/api/nlc';
  }
  // 测试和生产环境直接访问（需要 CORS 支持或后端代理）
  return 'http://opac.nlc.cn/F';
}
