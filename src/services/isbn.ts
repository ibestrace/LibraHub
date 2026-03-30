// ISBN 服务 - 支持多数据源获取书籍信息
import type { Book } from '@/types';

// 重试配置
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;  // 基础延迟（毫秒）
  maxDelay: number;   // 最大延迟（毫秒）
}

// 默认重试配置：指数退避 1s, 2s, 4s
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 4000,
};

// API 超时配置（毫秒）
const API_TIMEOUT = 5000;

// ========== ISBN 缓存配置 ==========
interface IsbnCacheEntry {
  data: Partial<Book> | null;
  timestamp: number;
  source: string;
}

const CACHE_CONFIG = {
  SUCCESS_TTL: 7 * 24 * 60 * 60 * 1000,  // 7 days for found books
  NULL_TTL: 60 * 60 * 1000,              // 1 hour for not-found ISBNs
  MAX_ENTRIES: 500,
  STORAGE_KEY: 'isbn_cache_v1'
};

// 缓存存储管理
class IsbnCache {
  private cache: Map<string, IsbnCacheEntry>;
  
  constructor() {
    this.cache = this.loadFromStorage();
  }
  
  private loadFromStorage(): Map<string, IsbnCacheEntry> {
    try {
      const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      }
    } catch {
      // Ignore parse errors
    }
    return new Map();
  }
  
  private saveToStorage(): void {
    try {
      const obj = Object.fromEntries(this.cache);
      localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Storage might be full, evict oldest entries
      this.evictOldest(50);
      try {
        const obj = Object.fromEntries(this.cache);
        localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(obj));
      } catch {
        // Give up if still failing
      }
    }
  }
  
  private evictOldest(count: number): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }
  
  get(isbn: string): IsbnCacheEntry | undefined {
    const entry = this.cache.get(isbn);
    if (!entry) return undefined;
    
    const now = Date.now();
    const ttl = entry.data ? CACHE_CONFIG.SUCCESS_TTL : CACHE_CONFIG.NULL_TTL;
    
    if (now - entry.timestamp > ttl) {
      this.cache.delete(isbn);
      this.saveToStorage();
      return undefined;
    }
    
    return entry;
  }
  
  set(isbn: string, data: Partial<Book> | null, source: string): void {
    // Evict if at capacity
    if (this.cache.size >= CACHE_CONFIG.MAX_ENTRIES) {
      this.evictOldest(10);
    }
    
    this.cache.set(isbn, {
      data,
      timestamp: Date.now(),
      source
    });
    this.saveToStorage();
  }
  
  clear(): void {
    this.cache.clear();
    localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
  }
  
  getStats(): { size: number } {
    return {
      size: this.cache.size
    };
  }
}

// 缓存单例
const isbnCache = new IsbnCache();

// OpenLibrary API 接口定义
interface OpenLibraryBookInfo {
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
interface GoogleBooksVolumeInfo {
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

interface GoogleBooksItem {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksItem[];
}

// API 配置
interface ApiConfig {
  name: string;
  baseUrl: string;
  priority: number;
  enabled: boolean;
}

/**
 * 检测当前运行环境
 * @returns 'browser' | 'node' | 'test'
 */
function detectEnvironment(): 'browser' | 'node' | 'test' {
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
async function fetchWithRetry(
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
function getNlcBaseUrl(): string {
  const env = detectEnvironment();
  if (env === 'browser') {
    // Vite 开发服务器代理路径
    return '/api/nlc';
  }
  // 测试和生产环境直接访问（需要 CORS 支持或后端代理）
  return 'http://opac.nlc.cn/F';
}

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
      name: 'GoogleBooks',
      baseUrl: 'https://www.googleapis.com/books/v1/volumes',
      priority: 3,
      enabled: true,
    },
    {
      name: 'OpenLibrary',
      baseUrl: 'https://openlibrary.org/api/books',
      priority: 4,
      enabled: true,
    },
  ];

  // 获取已启用的 API 列表(按优先级排序)
  private static getEnabledApis(): ApiConfig[] {
    return this.API_CONFIGS
      .filter(api => api.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * 通过 ISBN 获取书籍信息(支持多数据源)
   * @param isbn ISBN-10 或 ISBN-13
   * @returns 书籍信息对象
   */
  static async fetchByIsbn(isbn: string): Promise<Partial<Book> | null> {
    // 清理 ISBN（移除连字符和空格）
    const cleanIsbn = isbn.replace(/[-\s]/g, '');

    if (!this.isValidIsbn(cleanIsbn)) {
      console.error('无效的 ISBN 格式');
      return null;
    }

    // 检查缓存
    const cached = isbnCache.get(cleanIsbn);
    if (cached) {
      console.log(`[ISBN] 缓存命中: ${cleanIsbn} (来源: ${cached.source})`);
      return cached.data;
    }

    // 获取已启用的 API
    const enabledApis = this.getEnabledApis();

    // 按优先级依次尝试各个数据源
    for (const api of enabledApis) {
      console.log(`尝试使用 ${api.name} API 查询 ISBN: ${cleanIsbn}`);
      try {
        let bookInfo: Partial<Book> | null;

        if (api.name === 'NLC') {
          bookInfo = await this.fetchFromNLC(cleanIsbn);
        } else if (api.name === 'DoubanWeb') {
          bookInfo = await this.fetchFromDoubanWeb(cleanIsbn);
        } else if (api.name === 'GoogleBooks') {
          bookInfo = await this.fetchFromGoogleBooks(cleanIsbn);
        } else if (api.name === 'OpenLibrary') {
          bookInfo = await this.fetchFromOpenLibrary(cleanIsbn);
        } else {
          continue;
        }

        if (bookInfo) {
          console.log(`✓ 从 ${api.name} 成功获取书籍信息`);
          // 缓存成功的结果
          isbnCache.set(cleanIsbn, bookInfo, api.name);
          return bookInfo;
        }
      } catch (error) {
        console.warn(`${api.name} API 查询失败:`, error);
        continue;
      }
    }

    console.warn('所有数据源均未找到该 ISBN 的书籍信息');
    // 缓存空结果，防止短时间内重复请求
    isbnCache.set(cleanIsbn, null, 'none');
    return null;
  }

  /**
   * 清除 ISBN 缓存
   */
  static clearCache(): void {
    isbnCache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): { size: number } {
    return isbnCache.getStats();
  }

  /**
   * 强制刷新 ISBN 信息（绕过缓存）
   */
  static async refreshIsbn(isbn: string): Promise<Partial<Book> | null> {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');
    // 删除缓存条目
    isbnCache.set(cleanIsbn, null, 'refresh');
    // 重新获取
    return this.fetchByIsbn(cleanIsbn);
  }

  /**
   * 从豆瓣图书网页抓取书籍信息（无需 API Key，国内直连）
   *
   * 访问路径：https://book.douban.com/isbn/{isbn}/
   *   → 重定向至该书详情页 https://book.douban.com/subject/{id}/
   *
   * 数据提取：
   *   - og:title       → 书名
   *   - og:description → 简介
   *   - og:image       → 封面图 URL
   *   - #info div      → 作者、出版社、出版年、页数等详细信息
   *   - JSON-LD        → 结构化作者数据（更准确）
   *
   * 注意：依赖豆瓣网页结构，若页面变更可能失效
   */
  private static async fetchFromDoubanWeb(isbn: string): Promise<Partial<Book> | null> {
    const baseUrl = this.API_CONFIGS.find(a => a.name === 'DoubanWeb')!.baseUrl;
    const url = `${baseUrl}/${isbn}/`;
    console.log(`[ISBN] DoubanWeb 查询: ${url}`);

    try {
      // 豆瓣 ISBN 页面会 301 重定向到书籍详情页，fetchWithRetry 会跟随重定向
      const response = await fetchWithRetry(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Referer': 'https://book.douban.com/',
        },
      });

      if (!response.ok) {
        // 404 表示豆瓣没有该书籍
        if (response.status === 404) {
          console.warn('[ISBN] DoubanWeb 未找到该 ISBN 的书籍');
        } else {
          console.warn(`[ISBN] DoubanWeb 请求失败: HTTP ${response.status}`);
        }
        return null;
      }

      const html = await response.text();

      if (!html || html.length < 1000) {
        console.warn('[ISBN] DoubanWeb 响应内容异常（可能被限流）');
        return null;
      }

      return this.parseDoubanWebHtml(html, isbn);
    } catch (error) {
      const errorName = (error as Error).name || 'Unknown';
      const errorMsg = (error as Error).message || '无详细信息';
      console.error(`[ISBN] DoubanWeb 查询失败 (${errorName}): ${errorMsg}`);
      return null;
    }
  }

  /**
   * 解析豆瓣图书详情页 HTML
   *
   * 提取策略（可靠性从高到低）：
   *   1. JSON-LD（schema.org Book）   → 结构化数据，最稳定
   *   2. og: meta 标签               → Open Graph，较稳定
   *   3. #info div                   → 页面 DOM，依赖样式不变
   */
  private static parseDoubanWebHtml(html: string, isbn: string): Partial<Book> | null {
    try {
      // ── 1. 提取 og: meta 标签 ─────────────────────────────────────────────
      const ogMeta: Record<string, string> = {};
      for (const m of html.matchAll(/<meta[^>]+property="og:([^"]+)"[^>]+content="([^"]+)"/g)) {
        ogMeta[m[1]] = m[2];
      }
      // 兼容属性顺序反转的写法
      for (const m of html.matchAll(/<meta[^>]+content="([^"]+)"[^>]+property="og:([^"]+)"/g)) {
        if (!ogMeta[m[2]]) ogMeta[m[2]] = m[1];
      }

      // ── 2. 提取 JSON-LD ───────────────────────────────────────────────────
      let jsonLdAuthors: string[] = [];
      const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
      if (jsonLdMatch) {
        try {
          interface JsonLdPerson { '@type': string; name: string }
          interface JsonLdBook { '@type': string; name?: string; author?: JsonLdPerson | JsonLdPerson[]; isbn?: string }
          const ld: JsonLdBook = JSON.parse(jsonLdMatch[1]);
          if (ld['@type'] === 'Book' && ld.author) {
            const authors = Array.isArray(ld.author) ? ld.author : [ld.author];
            jsonLdAuthors = authors
              .map((a) => a.name?.replace(/&#39;/g, "'").trim() ?? '')
              .filter(Boolean);
          }
        } catch {
          // JSON-LD 解析失败，降级到其他方式
        }
      }

      // ── 3. 提取 #info div ─────────────────────────────────────────────────
      // #info 中包含作者、出版社、出版年、页数等信息
      // 注意：保留换行（每个字段一行），不合并为单行
      const infoMatch = html.match(/<div\s+id="info"[^>]*>([\s\S]*?)<\/div>/);
      const infoText = infoMatch
        ? infoMatch[1]
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/[ \t]+/g, ' ')    // 只压缩同行空格，保留换行
          .trim()
        : '';

      /**
       * 从 info 文本中提取指定字段的值（按行匹配）
       * info 每行格式：字段名: 值
       */
      const extractInfoField = (fieldName: string): string => {
        // 使用多行逐行查找，避免跨行误匹配
        for (const line of infoText.split('\n')) {
          const lineMatch = line.match(new RegExp(`^\\s*${fieldName}:\\s*(.+?)\\s*$`));
          if (lineMatch) return lineMatch[1].trim();
        }
        return '';
      };

      // ── 整合数据 ──────────────────────────────────────────────────────────
      const ogTitle = ogMeta['title'] ?? '';
      // 豆瓣 og:title 格式："书名 (副标题)" 或 "书名"
      // 去掉 "(第X版)" 这类副标题作为 subtitle
      const titleFull = ogTitle.replace(/\s*\(豆瓣\)\s*$/, '').trim();
      const titleParenMatch = titleFull.match(/^(.+?)\s*\((.+)\)\s*$/);
      const title = titleParenMatch ? titleParenMatch[1].trim() : titleFull;
      const subtitle = titleParenMatch ? titleParenMatch[2].trim() : undefined;

      if (!title) {
        console.warn('[ISBN] DoubanWeb 无法提取书名');
        return null;
      }

      // 作者：优先 JSON-LD，其次 info 字段
      let author = '';
      if (jsonLdAuthors.length > 0) {
        author = jsonLdAuthors.join(', ');
      } else {
        const authorRaw = extractInfoField('作者');
        // 清理括号内的国籍标注，如 "[美] 霍华德" → "霍华德"
        author = authorRaw.replace(/^\s*[\[（(][^）\]）)]+[）\]）)]\s*/, '').trim();
      }

      // 出版社
      const publisher = extractInfoField('出版社');

      // 出版年 → 标准化为 YYYY-MM-DD
      const pubYearRaw = extractInfoField('出版年');
      let publishDate: string | undefined;
      if (pubYearRaw) {
        const dateMatch = pubYearRaw.match(/^(\d{4})(?:[^\d](\d{1,2}))?/);
        if (dateMatch) {
          const y = dateMatch[1];
          const m = dateMatch[2] ? dateMatch[2].padStart(2, '0') : '01';
          publishDate = `${y}-${m}-01`;
        }
      }

      // 页数
      const pageRaw = extractInfoField('页数');
      const pageCount = pageRaw ? parseInt(pageRaw.replace(/,/g, ''), 10) || undefined : undefined;

      // 封面图（豆瓣 og:image，提升分辨率：l → xl）
      let cover: string | undefined;
      if (ogMeta['image']) {
        cover = ogMeta['image'].replace('/l/', '/xl/').replace('/m/', '/xl/');
      }

      // 简介
      const description = ogMeta['description'] ?? '';

      console.log('[ISBN] DoubanWeb 解析结果:', { title, author, publisher, publishDate, pageCount });

      return {
        title,
        subtitle,
        author,
        publisher,
        publishDate,
        isbn,
        pageCount,
        description,
        cover,
      };
    } catch (error) {
      console.error('[ISBN] DoubanWeb HTML 解析失败:', error);
      return null;
    }
  }

  /**
   * 从国家图书馆 OPAC 获取书籍信息
   *
   * 环境适配：
   *   - 浏览器（Vite dev）：通过 /api/nlc 代理转发（vite.config.ts 已配置）
   *   - 测试/生产：直接访问 opac.nlc.cn
   *
   * 接口说明（两步协议）：
   *   Step 1：访问 /F 获取含动态 session token 的页面
   *   Step 2：用动态 URL 发起 ISBN 精确查询，解析返回的 HTML 书目表格
   *
   * NLC OPAC 页面特点：
   *   - 单条结果时直接返回详情页（含 table id=td）
   *   - 多条结果时返回列表页，取第一条即可（ISBN 查询通常唯一）
   *   - HTML 属性无引号（如 class=td1），用正则解析更可靠
   */
  private static async fetchFromNLC(isbn: string): Promise<Partial<Book> | null> {
    const env = detectEnvironment();
    const baseUrl = this.API_CONFIGS.find(a => a.name === 'NLC')!.baseUrl;

    console.log(`[ISBN] NLC API 环境: ${env}, baseUrl: ${baseUrl}`);

    try {
      // Step 1：获取动态 session URL（带重试）
      console.log('[ISBN] NLC Step 1: 获取动态 session URL...');
      const baseRes = await fetchWithRetry(baseUrl);

      if (!baseRes.ok) {
        console.warn(`[ISBN] NLC 基础页请求失败: HTTP ${baseRes.status} ${baseRes.statusText}`);
        return null;
      }

      const baseHtml = await baseRes.text();

      // 动态 URL 形如 http://opac.nlc.cn:80/F/XXXXXXXX（从页面 JS 变量或链接中提取）
      const dynMatch = baseHtml.match(/http:\/\/opac\.nlc\.cn(?::\d+)?\/F\/[^\s?"<]+/);
      if (!dynMatch) {
        console.warn('[ISBN] NLC 未找到动态 session URL，页面结构可能已变更');
        console.debug('[ISBN] NLC 页面内容片段:', baseHtml.slice(0, 500));
        return null;
      }

      // 根据环境处理动态 URL
      let dynamicPath: string;
      if (env === 'browser') {
        // 浏览器环境：将 opac.nlc.cn 替换为 Vite 代理路径，绕过 CORS 限制
        dynamicPath = dynMatch[0].replace(/^http:\/\/opac\.nlc\.cn(?::\d+)?/, '/api/nlc');
      } else {
        // 测试/Node 环境：直接使用完整 URL
        dynamicPath = dynMatch[0];
      }
      console.log(`[ISBN] NLC 动态 URL: ${dynamicPath}`);

      // Step 2：发起 ISBN 精确查询（带重试）
      console.log('[ISBN] NLC Step 2: 发起 ISBN 查询...');
      const searchParams = new URLSearchParams({
        'func': 'find-b',
        'find_code': 'ISB',
        'request': isbn,
        'local_base': 'NLC01',
        'filter_code_1': 'WLN', 'filter_request_1': '',
        'filter_code_2': 'WYR', 'filter_request_2': '',
        'filter_code_3': 'WYR', 'filter_request_3': '',
        'filter_code_4': 'WFM', 'filter_request_4': '',
        'filter_code_5': 'WSL', 'filter_request_5': '',
      });

      const searchUrl = `${dynamicPath}?${searchParams.toString()}`;
      const searchRes = await fetchWithRetry(searchUrl);

      if (!searchRes.ok) {
        console.warn(`[ISBN] NLC 查询请求失败: HTTP ${searchRes.status} ${searchRes.statusText}`);
        return null;
      }

      let searchHtml = await searchRes.text();

      // 处理多结果列表页：NLC 在多条结果时返回列表页，需跳转到第一条详情
      // 判断依据：含有 set_number 参数（列表页翻页 URL 特征）且不含详情表格内容
      const isListPage = /set_number=\d+/.test(searchHtml) &&
        !/<table[^>]*id=.?td.?/i.test(searchHtml);

      if (isListPage) {
        console.log('[ISBN] NLC 返回多结果列表，尝试获取第一条详情...');

        // 提取第一条记录的详情链接（func=full-set-set 是 NLC 详情页的标识）
        const firstLinkMatch = searchHtml.match(
          /href='([^']*func=full-set-set[^']*)'/i
        ) || searchHtml.match(
          /href="([^"]*func=full-set-set[^"]*)"/i
        );

        if (!firstLinkMatch) {
          console.warn('[ISBN] NLC 列表页未找到详情链接');
          return null;
        }

        let detailUrl = firstLinkMatch[1];
        // 补全 URL（相对路径 → 绝对路径）
        if (!detailUrl.startsWith('http')) {
          if (env === 'browser') {
            detailUrl = detailUrl.startsWith('/') ? detailUrl : `/api/nlc/${detailUrl}`;
          } else {
            detailUrl = `http://opac.nlc.cn${detailUrl.startsWith('/') ? '' : '/'}${detailUrl}`;
          }
        } else if (env === 'browser') {
          detailUrl = detailUrl.replace(/^http:\/\/opac\.nlc\.cn(?::\d+)?/, '/api/nlc');
        }

        console.log(`[ISBN] NLC 跳转详情: ${detailUrl}`);
        const detailRes = await fetchWithRetry(detailUrl);

        if (!detailRes.ok) {
          console.warn(`[ISBN] NLC 详情页请求失败: HTTP ${detailRes.status}`);
          return null;
        }
        searchHtml = await detailRes.text();
      }

      console.log('[ISBN] NLC 查询成功，开始解析书目 HTML...');
      return this.parseNLCHtml(searchHtml, isbn);
    } catch (error) {
      const errorName = (error as Error).name || 'Unknown';
      const errorMsg = (error as Error).message || '无详细信息';
      console.error(`[ISBN] NLC 查询失败 (${errorName}): ${errorMsg}`);
      return null;
    }
  }

  /**
   * 解析国家图书馆 OPAC 返回的书目 HTML
   *
   * NLC HTML 特点：
   *   - 使用旧式 HTML（属性无引号，如 class=td1，id=td）
   *   - 书目数据在 <table id=td> 中，每行两个 <td class=td1>：字段名 | 字段值
   *   - 字段值含 HTML 标签（链接、图片）和 HTML 实体（&nbsp;、&rsquo;）
   *   - 字段名可能含首尾空白和 &nbsp;
   *
   * 使用正则而非 DOMParser 的原因：
   *   - DOMParser 是浏览器专属 API，Node.js / 测试环境不可用
   *   - 正则方案在两种环境下均可工作
   */
  private static parseNLCHtml(html: string, isbn: string): Partial<Book> | null {
    try {
      // 检查是否含书目表格（id=td，注意 NLC 的 HTML 属性无引号）
      if (!/<table[^>]*id=.?td.?/i.test(html)) {
        console.warn('[ISBN] NLC 未找到书目表格（table id=td），可能无结果或页面结构变更');
        return null;
      }

      // 提取 table#td 的内容（用正则，避免依赖 DOMParser）
      const tableMatch = html.match(/<table[^>]*id=.?td.?[^>]*>([\s\S]*?)<\/table>/i);
      if (!tableMatch) {
        console.warn('[ISBN] NLC 无法提取书目表格内容');
        return null;
      }

      const tableHtml = tableMatch[1];

      /**
       * 从 HTML 字符串中提取纯文本
       * 处理：HTML 标签、&nbsp;、HTML 实体、多余空白
       */
      const extractText = (rawHtml: string): string => {
        return rawHtml
          .replace(/<[^>]+>/g, '')          // 移除所有 HTML 标签
          .replace(/&nbsp;/g, ' ')           // &nbsp; → 空格
          .replace(/&rsquo;/g, "'")          // &rsquo; → 单引号
          .replace(/&amp;/g, '&')            // &amp; → &
          .replace(/&lt;/g, '<')             // &lt; → <
          .replace(/&gt;/g, '>')             // &gt; → >
          .replace(/&quot;/g, '"')           // &quot; → "
          .replace(/&#\d+;/g, '')            // 移除其他数字 HTML 实体
          .replace(/\s+/g, ' ')              // 合并连续空白
          .trim();
      };

      // 提取所有 <tr> 行
      const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const data: Record<string, string> = {};
      let prevKey = '';
      let trMatch: RegExpExecArray | null;

      while ((trMatch = trPattern.exec(tableHtml)) !== null) {
        const rowHtml = trMatch[1];

        // 提取该行中所有 class=td1 的 <td>（支持有引号/无引号两种写法）
        const tdPattern = /<td[^>]*class=.?td1.?[^>]*>([\s\S]*?)<\/td>/gi;
        const tds: string[] = [];
        let tdMatch: RegExpExecArray | null;

        while ((tdMatch = tdPattern.exec(rowHtml)) !== null) {
          tds.push(extractText(tdMatch[1]));
        }

        if (tds.length >= 2) {
          const k = tds[0];
          const v = tds[1];
          if (k) {
            data[k] = v;
            prevKey = k;
          } else if (prevKey && v) {
            // 同一字段的续行：用换行拼接
            data[prevKey] = data[prevKey] ? `${data[prevKey]}\n${v}` : v;
          }
        } else if (tds.length === 1 && prevKey && tds[0]) {
          data[prevKey] = data[prevKey] ? `${data[prevKey]}\n${tds[0]}` : tds[0];
        }
      }

      if (Object.keys(data).length === 0) {
        console.warn('[ISBN] NLC 书目表格行数为 0（可能无结果）');
        return null;
      }

      console.debug('[ISBN] NLC 原始字段:', data);

      // ── 解析题名 ──────────────────────────────────────────────────────────
      // 来源：「题名与责任」字段
      // 格式：书名 [文种] = 英文题名 / 著者 ; 译者
      // 取第一个 [ / = 之前的内容
      let title = data['题名与责任'] ?? '';
      const titleMatch = title.match(/^([^[\/=\(（]+)/);
      if (titleMatch) title = titleMatch[1].trim();
      // 去掉末尾的 [专著]、[文献] 等方括号标注
      title = title.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
      if (!title) {
        console.warn('[ISBN] NLC 无法解析题名');
        return null;
      }

      // ── 解析作者 ──────────────────────────────────────────────────────────
      // 优先取「著者」字段（更干净），否则从「题名与责任」的责任者部分提取
      // 「著者」格式：(美)布赖恩特 (Bryant, Randal E.) 著
      //              或 霍春阳 著
      let author = '';
      const authorRaw = data['著者'] ?? data['作者'] ?? '';
      if (authorRaw) {
        const authorLines = authorRaw.split('\n').map(l => l.trim()).filter(Boolean);
        const authorCleaned = authorLines.map(line => {
          // 移除末尾的 著/编/译/主编 等角色标注
          const m = line.match(/^(.+?)\s+(?:著|编|译|主编|主著|编著|编译|整理)$/);
          return m ? m[1].trim() : line;
        });
        author = authorCleaned.join(', ');
      } else {
        // 从题名与责任字段的 / 之后提取
        const respMatch = (data['题名与责任'] ?? '').match(/\/\s*(.+?)(?:\s*;\s*|$)/);
        if (respMatch) {
          author = respMatch[1]
            .replace(/\s+(?:著|编|译|主编|主著)$/, '')
            .trim();
        }
      }

      // ── 解析出版社和出版年 ────────────────────────────────────────────────
      // 「出版项」格式：北京 : 机械工业出版社, 2016
      const pubItem = data['出版项'] ?? '';
      const publisherMatch = pubItem.match(/:\s*(.+?)\s*,\s*(\d{4})/);
      const publisher = publisherMatch ? publisherMatch[1].trim() : '';
      const year = publisherMatch
        ? publisherMatch[2]
        : (pubItem.match(/\b(\d{4})\b/)?.[1] ?? '');
      const publishDate = year ? `${year}-01-01` : undefined;

      // ── 解析页数 ───────────────────────────────────────────────────────────
      // NLC 使用「载体形态项」字段（注意：不是「形态项」）
      // MARC 格式示例：
      //   "737页 ; 24cm"    → 737 页
      //   "34,737页 ; 26cm" → 737 页（34 是前附页数，逗号分隔）
      //   "12,365页 ; 26cm" → 365 页（取最后一段数字）
      const physicalDesc = data['载体形态项'] ?? data['形态项'] ?? '';
      // 从 "页" 字往前取：提取最后一组连续数字（不含千位逗号）
      const pageMatch = physicalDesc.match(/(?:^|,|\s)(\d+)\s*页/);
      // 如果有 "X,YYY页" 形式，取逗号后的数字（正文页数）
      const pageMatchComma = physicalDesc.match(/,(\d+)\s*页/);
      const pageCount = pageMatchComma
        ? parseInt(pageMatchComma[1], 10)
        : pageMatch
          ? parseInt(pageMatch[1], 10)
          : undefined;

      // ── 解析 ISBN ─────────────────────────────────────────────────────────
      // NLC 的 ISBN 字段格式：978-7-111-54493-7 CNY139.00（含价格）
      const isbnRaw = data['ISBN'] ?? '';
      const isbnClean = isbnRaw.replace(/-/g, '').match(/\d{13}|\d{10}/)?.[0] ?? isbn;

      // ── 内容提要 ──────────────────────────────────────────────────────────
      const description = data['内容提要'] ?? data['摘要'] ?? '';

      console.log('[ISBN] NLC 解析结果:', { title, author, publisher, year, pageCount });

      return {
        title,
        author,
        publisher,
        publishDate,
        isbn: isbnClean,
        pageCount,
        description,
      };
    } catch (error) {
      console.error('[ISBN] NLC HTML 解析失败:', error);
      return null;
    }
  }

  /**
   * 从 Google Books API 获取书籍信息（支持中文书籍，无需 API Key）
   * 注意：国内访问可能不稳定，建议配置代理或后端转发
   */
  private static async fetchFromGoogleBooks(isbn: string): Promise<Partial<Book> | null> {
    const baseUrl = this.API_CONFIGS.find(a => a.name === 'GoogleBooks')!.baseUrl;
    console.log(`[ISBN] Google Books API baseUrl: ${baseUrl}`);

    try {
      // 先尝试中文限定查询（带重试）
      console.log('[ISBN] Google Books: 尝试中文限定查询...');
      const url = `${baseUrl}?q=isbn:${isbn}&langRestrict=zh`;
      const response = await fetchWithRetry(url);
      
      if (!response.ok) {
        console.warn(`[ISBN] Google Books API 请求失败: HTTP ${response.status} ${response.statusText}`);
        return null;
      }

      const data: GoogleBooksResponse = await response.json();

      if (!data.totalItems || !data.items || data.items.length === 0) {
        // 中文限定未找到时，不限语言重试一次
        console.warn('[ISBN] Google Books 中文限定未找到，尝试不限语言...');
        const fbUrl = `${baseUrl}?q=isbn:${isbn}`;
        const fbResponse = await fetchWithRetry(fbUrl);
        
        if (!fbResponse.ok) {
          console.warn(`[ISBN] Google Books 不限语言查询失败: HTTP ${fbResponse.status}`);
          return null;
        }
        
        const fbData: GoogleBooksResponse = await fbResponse.json();
        if (!fbData.totalItems || !fbData.items || fbData.items.length === 0) {
          console.warn('[ISBN] Google Books 未找到该 ISBN 的书籍信息');
          return null;
        }
        console.log('[ISBN] Google Books 不限语言查询成功');
        return this.parseGoogleBooksItem(fbData.items[0], isbn);
      }

      console.log('[ISBN] Google Books 中文限定查询成功');
      return this.parseGoogleBooksItem(data.items[0], isbn);
    } catch (error) {
      const errorName = (error as Error).name || 'Unknown';
      const errorMsg = (error as Error).message || '无详细信息';
      console.error(`[ISBN] Google Books API 查询失败 (${errorName}): ${errorMsg}`);
      
      // 提供用户友好的错误提示
      if (errorName === 'TypeError' && errorMsg.includes('fetch')) {
        console.warn('[ISBN] 提示: 国内访问 Google Books API 可能受限，请检查网络或配置代理');
      }
      return null;
    }
  }

  /**
   * 解析 Google Books API 返回的单条书目
   */
  private static parseGoogleBooksItem(item: GoogleBooksItem, isbn: string): Partial<Book> {
    const info = item.volumeInfo;

    const author = info.authors ? info.authors.join(', ') : '';

    // 处理封面图（强制 HTTPS，提升清晰度）
    let cover: string | undefined;
    if (info.imageLinks?.thumbnail) {
      cover = info.imageLinks.thumbnail
        .replace(/^http:\/\//, 'https://')
        .replace('zoom=1', 'zoom=3');
    }

    // 解析出版日期
    let publishDate: string | undefined;
    if (info.publishedDate) {
      const dateMatch = info.publishedDate.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/);
      if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2] || '01';
        const day = dateMatch[3] || '01';
        publishDate = `${year}-${month}-${day}`;
      }
    }

    return {
      title: info.title,
      subtitle: info.subtitle,
      author,
      publisher: info.publisher,
      publishDate,
      isbn,
      pageCount: info.pageCount,
      description: info.description,
      cover,
    };
  }

  /**
   * 从 OpenLibrary API 获取书籍信息
   * 注意：国内访问可能不稳定，建议配置代理或后端转发
   */
  private static async fetchFromOpenLibrary(isbn: string): Promise<Partial<Book> | null> {
    const baseUrl = this.API_CONFIGS.find(a => a.name === 'OpenLibrary')!.baseUrl;
    const url = `${baseUrl}?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    console.log(`[ISBN] OpenLibrary API URL: ${url}`);

    try {
      console.log('[ISBN] OpenLibrary: 发起查询...');
      const response = await fetchWithRetry(url);
      
      if (!response.ok) {
        console.warn(`[ISBN] OpenLibrary API 请求失败: HTTP ${response.status} ${response.statusText}`);
        return null;
      }

      const data: Record<string, OpenLibraryBookInfo> = await response.json();
      const key = `ISBN:${isbn}`;

      if (!data[key] || Object.keys(data[key]).length === 0) {
        console.warn('[ISBN] OpenLibrary 未找到该 ISBN 的书籍信息');
        return null;
      }

      console.log('[ISBN] OpenLibrary 查询成功');
      const bookData = data[key];

      const author = bookData.authors
        ? bookData.authors.map(a => a.name).join(', ')
        : '';

      const publisher = bookData.publishers
        ? bookData.publishers.join(', ')
        : '';

      const description = typeof bookData.description === 'string'
        ? bookData.description
        : bookData.description?.value || '';

      let publishDate: string | undefined;
      if (bookData.publish_date) {
        const dateMatch = bookData.publish_date.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (dateMatch) {
          publishDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
        } else if (bookData.publish_year) {
          publishDate = `${bookData.publish_year}-01-01`;
        } else if (/^\d{4}$/.test(bookData.publish_date)) {
          publishDate = `${bookData.publish_date}-01-01`;
        }
      }

      let cover: string | undefined;
      if (bookData.covers && bookData.covers.length > 0) {
        cover = `https://covers.openlibrary.org/b/id/${bookData.covers[0]}-L.jpg`;
      }

      return {
        title: bookData.title,
        subtitle: bookData.subtitle,
        author,
        publisher,
        publishDate,
        isbn,
        pageCount: bookData.number_of_pages,
        description,
        cover,
      };
    } catch (error) {
      const errorName = (error as Error).name || 'Unknown';
      const errorMsg = (error as Error).message || '无详细信息';
      console.error(`[ISBN] OpenLibrary API 查询失败 (${errorName}): ${errorMsg}`);
      
      // 提供用户友好的错误提示
      if (errorName === 'TypeError' && errorMsg.includes('fetch')) {
        console.warn('[ISBN] 提示: 国内访问 OpenLibrary API 可能受限，请检查网络或配置代理');
      }
      return null;
    }
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
    const cleanIsbn = isbn.replace(/[-\s]/g, '');

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
    const cleanIsbn = isbn10.replace(/[-\s]/g, '').toUpperCase();

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
    const cleanIsbn = isbn.replace(/[-\s]/g, '');

    if (cleanIsbn.length === 10) {
      // ISBN-10 格式：X-XXX-XXXXX-X
      return `${cleanIsbn[0]}-${cleanIsbn.slice(1, 4)}-${cleanIsbn.slice(4, 9)}-${cleanIsbn[9]}`;
    } else if (cleanIsbn.length === 13) {
      // ISBN-13 格式：XXX-X-XXX-XXXXX-X（修复：最后一位应为 cleanIsbn[12]）
      return `${cleanIsbn.slice(0, 3)}-${cleanIsbn[3]}-${cleanIsbn.slice(4, 7)}-${cleanIsbn.slice(7, 12)}-${cleanIsbn[12]}`;
    }

    return isbn;
  }
}
