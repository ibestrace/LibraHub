// ISBN 服务主模块
import type { Book } from '@/types';
import type { ApiConfig, ErrorType, IsbnQueryProgress, DataSourceHealth } from './types';
import { ErrorTypes } from './types';
import { isbnCache } from './cache';
import { getNlcBaseUrl } from './network';
import { fetchFromDoubanWeb, fetchFromNLC, fetchFromGoogleBooks, fetchFromOpenLibrary, fetchFromTinyNews } from './sources';

export class IsbnService {
  /**
   * API 数据源配置（按优先级排序）
   *
   * 数据源选择策略（国内网络优先）：
   *   1. NLC（国家图书馆 OPAC）     - 国内直连，中文书籍权威来源
   *   2. DoubanWeb（豆瓣网页抓取）   - 国内直连，中文书籍覆盖广，含封面
   *   3. GoogleBooks                 - 国际 API，国内需代理，英文书籍更全
   *   4. OpenLibrary                 - 国际 API，国内需代理，开放数据
   *
   * 注：原豆瓣 v2 API 已停止公开访问（需申请 API Key），改用网页抓取方案
   */
  private static readonly API_CONFIGS: ApiConfig[] = [
    {
      name: 'NLC',
      baseUrl: getNlcBaseUrl(),  // 动态：浏览器=/api/nlc（代理），Node=http://opac.nlc.cn/F
      priority: 1,
      enabled: true,
    },
    {
      name: 'DoubanWeb',
      baseUrl: 'https://book.douban.com/isbn',
      priority: 2,
      enabled: true,
    },
    {
      name: 'TinyNews',
      baseUrl: 'https://isbn.tinynews.org/api/v1/book',
      priority: 3,
      enabled: true,
    },
    {
      name: 'GoogleBooks',
      baseUrl: 'https://www.googleapis.com/books/v1/volumes',
      priority: 4,
      enabled: true,
    },
    {
      name: 'OpenLibrary',
      baseUrl: 'https://openlibrary.org/api/books',
      priority: 5,
      enabled: true,
    },
  ];

  // 数据源健康统计（持久化到 localStorage）
  private static readonly HEALTH_STORAGE_KEY = 'isbn_data_source_health';
  private static healthData: Record<string, DataSourceHealth> = {};

  // 获取已启用的 API 列表(按优先级排序)
  private static getEnabledApis(): ApiConfig[] {
    return this.API_CONFIGS
      .filter(api => api.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取数据源健康统计
   */
  static getDataSourceHealth(): Record<string, DataSourceHealth> {
    if (Object.keys(this.healthData).length === 0) {
      this.loadHealthData();
    }
    return { ...this.healthData };
  }

  /**
   * 重置数据源健康统计
   */
  static resetDataSourceHealth(): void {
    this.healthData = {};
    localStorage.removeItem(this.HEALTH_STORAGE_KEY);
  }

  /**
   * 从 localStorage 加载健康数据
   */
  private static loadHealthData(): void {
    try {
      const stored = localStorage.getItem(this.HEALTH_STORAGE_KEY);
      if (stored) {
        this.healthData = JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * 保存健康数据到 localStorage
   */
  private static saveHealthData(): void {
    try {
      localStorage.setItem(this.HEALTH_STORAGE_KEY, JSON.stringify(this.healthData));
    } catch {
      // Storage full, ignore
    }
  }

  /**
   * 记录数据源请求结果
   */
  private static recordHealth(source: string, success: boolean, responseTime: number): void {
    if (!this.healthData[source]) {
      this.healthData[source] = {
        name: source,
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        timeoutCount: 0,
        successRate: 0,
        avgResponseTime: 0,
        lastSuccessAt: null,
      };
    }

    const health = this.healthData[source];
    health.totalRequests++;
    
    if (success) {
      health.successCount++;
      health.lastSuccessAt = Date.now();
    } else {
      health.failureCount++;
    }

    // 检测超时（响应时间 > 3s）
    if (responseTime > 3000) {
      health.timeoutCount++;
    }

    // 更新成功率
    health.successRate = health.totalRequests > 0 
      ? Math.round((health.successCount / health.totalRequests) * 100) 
      : 0;

    // 更新平均响应时间（移动平均）
    health.avgResponseTime = Math.round(
      (health.avgResponseTime * (health.totalRequests - 1) + responseTime) / health.totalRequests
    );

    this.saveHealthData();
  }

  /**
   * 根据健康统计动态调整数据源优先级
   */
  private static getEnabledApisWithHealth(): ApiConfig[] {
    const apis = this.getEnabledApis();
    
    // 如果没有健康数据，直接返回原始排序
    if (Object.keys(this.healthData).length === 0) {
      return apis;
    }

    // 计算动态优先级：原始优先级 + 健康惩罚
    return apis.map(api => {
      const health = this.healthData[api.name];
      if (!health || health.totalRequests < 3) {
        return api; // 数据不足，不调整
      }

      let adjustedPriority = api.priority;
      
      // 成功率低于 50% 且请求次数超过 10 次，降低优先级
      if (health.successRate < 50 && health.totalRequests >= 10) {
        adjustedPriority += 10;
      }
      // 超时率超过 30%，降低优先级
      if (health.totalRequests > 0 && (health.timeoutCount / health.totalRequests) > 0.3) {
        adjustedPriority += 5;
      }
      // 超过 24 小时没有成功记录，降低优先级
      if (health.lastSuccessAt && Date.now() - health.lastSuccessAt > 24 * 60 * 60 * 1000) {
        adjustedPriority += 3;
      }

      return { ...api, priority: adjustedPriority };
    }).sort((a, b) => a.priority - b.priority);
  }

  /**
   * 错误信息映射
   */
  private static readonly errorMessages = {
    [ErrorTypes.INVALID_ISBN]: '无效的 ISBN 格式，请检查输入',
    [ErrorTypes.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
    [ErrorTypes.API_ERROR]: 'API 请求失败，请稍后重试',
    [ErrorTypes.NOT_FOUND]: '未找到该 ISBN 的书籍信息',
    [ErrorTypes.UNKNOWN_ERROR]: '未知错误，请稍后重试'
  };

  /**
   * 获取用户友好的错误信息
   * @param errorType 错误类型
   * @returns 用户友好的错误信息
   */
  static getErrorMessage(errorType: ErrorType): string {
    return this.errorMessages[errorType] || this.errorMessages[ErrorTypes.UNKNOWN_ERROR];
  }

  /**
   * 通过 ISBN 获取书籍信息(支持多数据源)
   * @param isbn ISBN-10 或 ISBN-13
   * @param onProgress 进度回调（可选）
   * @returns 书籍信息对象
   */
  static async fetchByIsbn(
    isbn: string, 
    onProgress?: (progress: IsbnQueryProgress) => void
  ): Promise<Partial<Book> | null> {
    // 尝试自动修正 ISBN 格式
    const correctedIsbn = this.autoCorrectIsbn(isbn);
    const cleanIsbn = correctedIsbn || isbn.replace(/[-]/g, '');

    if (!this.isValidIsbn(cleanIsbn)) {
      console.error('无效的 ISBN 格式');
      return null;
    }

    // 如果 ISBN 被修正，记录日志
    if (correctedIsbn && correctedIsbn !== isbn.replace(/[\s-]/g, '')) {
      console.log(`[ISBN] 自动修正: ${isbn} → ${correctedIsbn}`);
    }

    // 检查缓存
    const cached = await isbnCache.get(cleanIsbn);
    if (cached) {
      console.log(`[ISBN] 缓存命中: ${cleanIsbn} (来源: ${cached.source})`);
      return cached.data;
    }

    // 检查本地数据库
    const localBookInfo = await isbnCache.getFromLocalDatabase(cleanIsbn);
    if (localBookInfo) {
      console.log(`[ISBN] 本地数据库命中: ${cleanIsbn}`);
      // 更新缓存
      await isbnCache.set(cleanIsbn, localBookInfo, 'local');
      return localBookInfo;
    }

    // 获取已启用的 API（考虑健康统计）
    const enabledApis = this.getEnabledApisWithHealth();

    // 初始化进度状态
    const progress: IsbnQueryProgress = {
      currentSource: null,
      sourceStatuses: {},
      isComplete: false,
      successfulSource: null,
    };

    // 初始化所有数据源状态为 pending
    for (const api of enabledApis) {
      progress.sourceStatuses[api.name] = 'pending';
    }

    // 通知进度
    const notifyProgress = () => {
      if (onProgress) {
        onProgress({ ...progress, sourceStatuses: { ...progress.sourceStatuses } });
      }
    };

    // 并行请求所有数据源
    const apiPromises = enabledApis.map(async (api) => {
      progress.sourceStatuses[api.name] = 'querying';
      progress.currentSource = api.name;
      notifyProgress();

      const startTime = Date.now();
      try {
        let bookInfo: Partial<Book> | null;

        if (api.name === 'TinyNews') {
          bookInfo = await fetchFromTinyNews(cleanIsbn);
        } else if (api.name === 'NLC') {
          bookInfo = await fetchFromNLC(cleanIsbn);
        } else if (api.name === 'DoubanWeb') {
          bookInfo = await fetchFromDoubanWeb(cleanIsbn);
        } else if (api.name === 'GoogleBooks') {
          bookInfo = await fetchFromGoogleBooks(cleanIsbn);
        } else if (api.name === 'OpenLibrary') {
          bookInfo = await fetchFromOpenLibrary(cleanIsbn);
        } else {
          progress.sourceStatuses[api.name] = 'failed';
          notifyProgress();
          return null;
        }

        const responseTime = Date.now() - startTime;

        if (bookInfo) {
          console.log(`✓ 从 ${api.name} 成功获取书籍信息 (${responseTime}ms)`);
          progress.sourceStatuses[api.name] = 'success';
          this.recordHealth(api.name, true, responseTime);
          notifyProgress();
          return { bookInfo, source: api.name };
        } else {
          progress.sourceStatuses[api.name] = 'failed';
          this.recordHealth(api.name, false, responseTime);
          notifyProgress();
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorName = (error as Error).name || 'Unknown';
        const isTimeout = errorName === 'AbortError';
        
        console.warn(`${api.name} API 查询失败 (${errorName})`);
        progress.sourceStatuses[api.name] = isTimeout ? 'timeout' : 'failed';
        this.recordHealth(api.name, false, responseTime);
        notifyProgress();
      }
      return null;
    });

    // 等待所有请求完成，获取第一个成功的结果
    const results = await Promise.all(apiPromises);
    const successfulResult = results.find(result => result !== null);

    progress.isComplete = true;
    progress.currentSource = null;

    if (successfulResult) {
      const { bookInfo, source } = successfulResult;
      progress.successfulSource = source;
      notifyProgress();
      
      // 缓存成功的结果
      await isbnCache.set(cleanIsbn, bookInfo, source);
      // 添加到本地数据库
      await isbnCache.addToLocalDatabase(cleanIsbn, bookInfo);
      return bookInfo;
    }

    console.warn('所有数据源均未找到该 ISBN 的书籍信息');
    notifyProgress();
    
    // 缓存空结果，防止短时间内重复请求
    await isbnCache.set(cleanIsbn, null, 'none');
    return null;
  }

  /**
   * 清除 ISBN 缓存
   */
  static async clearCache(): Promise<void> {
    await isbnCache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  static async getCacheStats(): Promise<{ size: number }> {
    return await isbnCache.getStats();
  }

  /**
   * 强制刷新 ISBN 信息（绕过缓存）
   */
  static async refreshIsbn(isbn: string): Promise<Partial<Book> | null> {
    const cleanIsbn = isbn.replace(/[-]/g, '');
    // 删除缓存条目
    await isbnCache.delete(cleanIsbn);
    // 重新获取
    return this.fetchByIsbn(cleanIsbn);
  }

  /**
   * 设置 API 配置
   */
  static setApiConfig(apiName: string, enabled: boolean, priority?: number): void {
    const api = this.API_CONFIGS.find(a => a.name === apiName);
    if (api) {
      api.enabled = enabled;
      if (priority !== undefined) {
        api.priority = priority;
      }
    }
  }

  /**
   * 获取当前 API 配置
   */
  static getApiConfigs(): ApiConfig[] {
    return this.API_CONFIGS;
  }

  /**
   * 验证 ISBN 格式
   * @param isbn ISBN 字符串
   * @returns 是否有效
   */
  static isValidIsbn(isbn: string): boolean {
    const cleanIsbn = isbn.replace(/[\s-]/g, '');

    // ISBN-10 验证
    if (/^\d{9}[\dX]$/.test(cleanIsbn)) {
      return this.validateIsbn10(cleanIsbn);
    }

    // ISBN-13 验证
    if (/^\d{13}$/.test(cleanIsbn)) {
      return this.validateIsbn13(cleanIsbn);
    }

    return false;
  }

  /**
   * 验证 ISBN-10 校验位
   */
  private static validateIsbn10(isbn: string): boolean {
    const chars = isbn.split('');
    const lastChar = chars.pop() ?? '';

    const sum = chars.reduce((acc, char, index) => {
      return acc + parseInt(char) * (10 - index);
    }, 0);

    const checkDigit = lastChar === 'X' ? 10 : parseInt(lastChar);
    const remainder = sum % 11;
    const expectedCheck = remainder === 0 ? 0 : 11 - remainder;

    return checkDigit === expectedCheck;
  }

  /**
   * 验证 ISBN-13 校验位
   */
  private static validateIsbn13(isbn: string): boolean {
    const digits = isbn.split('').map(Number);
    const lastDigit = digits.pop()!;

    const sum = digits.reduce((acc, digit, index) => {
      return acc + digit * (index % 2 === 0 ? 1 : 3);
    }, 0);

    const checkDigit = (10 - (sum % 10)) % 10;
    return lastDigit === checkDigit;
  }

  /**
   * ISBN-10 转 ISBN-13
   */
  static isbn10To13(isbn10: string): string | null {
    const cleanIsbn = isbn10.replace(/[\s-]/g, '').toUpperCase();

    if (!/^\d{9}[\dX]$/.test(cleanIsbn)) {
      return null;
    }

    const prefix = '978';
    const baseIsbn = cleanIsbn.slice(0, 9);
    const tempIsbn = prefix + baseIsbn;

    const sum = tempIsbn.split('').reduce((acc, digit, index) => {
      return acc + parseInt(digit) * (index % 2 === 0 ? 1 : 3);
    }, 0);

    const checkDigit = (10 - (sum % 10)) % 10;
    return tempIsbn + checkDigit;
  }

  /**
   * 格式化 ISBN 显示（添加连字符）
   */
  static formatIsbn(isbn: string): string {
    const cleanIsbn = isbn.replace(/[\s-]/g, '');

    if (cleanIsbn.length === 10) {
      // ISBN-10 格式：X-XXX-XXXXX-X
      return `${cleanIsbn[0]}-${cleanIsbn.slice(1, 4)}-${cleanIsbn.slice(4, 9)}-${cleanIsbn[9]}`;
    } else if (cleanIsbn.length === 13) {
      // ISBN-13 格式：XXX-X-XXX-XXXXX-X
      return `${cleanIsbn.slice(0, 3)}-${cleanIsbn[3]}-${cleanIsbn.slice(4, 7)}-${cleanIsbn.slice(7, 12)}-${cleanIsbn[12]}`;
    }

    return isbn;
  }

  /**
   * 自动修正 ISBN 格式
   * @param isbn 输入的 ISBN 字符串
   * @returns 修正后的 ISBN 字符串，或 null 如果无法修正
   */
  static autoCorrectIsbn(isbn: string): string | null {
    // 清理 ISBN（移除连字符、空格）
    const cleanIsbn = isbn.replace(/[\s-]/g, '');

    // 检查长度
    if (cleanIsbn.length === 9) {
      // 尝试补全 ISBN-10 校验位
      return this.completeIsbn10(cleanIsbn);
    } else if (cleanIsbn.length === 12) {
      // 尝试补全 ISBN-13 校验位
      return this.completeIsbn13(cleanIsbn);
    } else if (cleanIsbn.length === 10 || cleanIsbn.length === 13) {
      // 验证现有 ISBN
      if (this.isValidIsbn(cleanIsbn)) {
        return cleanIsbn;
      }
      // 尝试修复校验位
      if (cleanIsbn.length === 10) {
        return this.fixIsbn10CheckDigit(cleanIsbn);
      } else {
        return this.fixIsbn13CheckDigit(cleanIsbn);
      }
    }

    return null;
  }

  /**
   * 补全 ISBN-10 校验位
   */
  private static completeIsbn10(isbn: string): string | null {
    if (isbn.length !== 9 || !/^\d{9}$/.test(isbn)) {
      return null;
    }

    const sum = isbn.split('').reduce((acc, char, index) => {
      return acc + parseInt(char) * (10 - index);
    }, 0);

    const remainder = sum % 11;
    const checkDigit = remainder === 0 ? '0' : remainder === 1 ? 'X' : (11 - remainder).toString();

    return isbn + checkDigit;
  }

  /**
   * 补全 ISBN-13 校验位
   */
  private static completeIsbn13(isbn: string): string | null {
    if (isbn.length !== 12 || !/^\d{12}$/.test(isbn)) {
      return null;
    }

    const sum = isbn.split('').reduce((acc, digit, index) => {
      return acc + parseInt(digit) * (index % 2 === 0 ? 1 : 3);
    }, 0);

    const checkDigit = ((10 - (sum % 10)) % 10).toString();
    return isbn + checkDigit;
  }

  /**
   * 修复 ISBN-10 校验位
   */
  private static fixIsbn10CheckDigit(isbn: string): string | null {
    if (isbn.length !== 10 || !/^\d{9}[\dX]$/.test(isbn)) {
      return null;
    }

    const baseIsbn = isbn.slice(0, 9);
    return this.completeIsbn10(baseIsbn);
  }

  /**
   * 修复 ISBN-13 校验位
   */
  private static fixIsbn13CheckDigit(isbn: string): string | null {
    if (isbn.length !== 13 || !/^\d{13}$/.test(isbn)) {
      return null;
    }

    const baseIsbn = isbn.slice(0, 12);
    return this.completeIsbn13(baseIsbn);
  }

  /**
   * 批量处理 ISBN 列表
   * @param isbns ISBN 列表
   * @param concurrency 并发数，默认 3
   * @returns 处理结果数组
   */
  static async batchProcessIsbns(
    isbns: string[],
    concurrency: number = 3
  ): Promise<Array<{
    isbn: string;
    originalIsbn: string;
    result: Partial<Book> | null;
    error: string | null;
  }>> {
    const results: Array<{
      isbn: string;
      originalIsbn: string;
      result: Partial<Book> | null;
      error: string | null;
    }> = [];

    // 清理、修正和验证 ISBN
    const processedIsbns = isbns
      .map(isbn => {
        const trimmedIsbn = isbn.trim();
        const correctedIsbn = this.autoCorrectIsbn(trimmedIsbn);
        const finalIsbn = correctedIsbn || trimmedIsbn.replace(/[\s-]/g, '');
        const isValid = this.isValidIsbn(finalIsbn);
        
        if (correctedIsbn && correctedIsbn !== trimmedIsbn.replace(/[\s-]/g, '')) {
          console.log(`[ISBN] 自动修正: ${trimmedIsbn} → ${correctedIsbn}`);
        }
        
        return { originalIsbn: trimmedIsbn, isbn: finalIsbn, isValid };
      });

    // 有效的 ISBN
    const validIsbns = processedIsbns.filter(item => item.isValid);

    // 分批处理
    const batches: Array<typeof validIsbns> = [];
    for (let i = 0; i < validIsbns.length; i += concurrency) {
      batches.push(validIsbns.slice(i, i + concurrency));
    }

    // 按批次处理
    for (const batch of batches) {
      const batchPromises = batch.map(async (item) => {
        try {
          const result = await this.fetchByIsbn(item.isbn);
          return {
            isbn: item.isbn,
            originalIsbn: item.originalIsbn,
            result,
            error: null
          };
        } catch (error) {
          return {
            isbn: item.isbn,
            originalIsbn: item.originalIsbn,
            result: null,
            error: (error as Error).message || '处理失败'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // 添加无效 ISBN 的结果
    const invalidIsbns = processedIsbns.filter(item => !item.isValid && item.originalIsbn);

    for (const item of invalidIsbns) {
      results.push({
        isbn: item.isbn,
        originalIsbn: item.originalIsbn,
        result: null,
        error: '无效的 ISBN 格式'
      });
    }

    return results;
  }
}

// 导出错误类型
export { ErrorTypes };
