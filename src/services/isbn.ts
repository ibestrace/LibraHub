// ISBN 服务 - 对接豆瓣 API 获取书籍信息
import type { Book } from '@/types';

interface DoubanBookInfo {
  title: string;
  title_origin?: string;
  subtitle?: string;
  author: string[];
  translator?: string[];
  publisher: string;
  pubdate: string;
  isbn: string;
  isbn13: string;
  pages: number;
  price: string;
  summary: string;
  image: string;
  binding: string;
  tags: Array<{ name: string }>;
}

export class IsbnService {
  // 豆瓣 API 基础 URL
  private static readonly DOUBAN_API_BASE = 'https://api.douban.com/v2/book';

  /**
   * 通过 ISBN 获取书籍信息
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

    try {
      // 使用豆瓣 API
      const url = `${this.DOUBAN_API_BASE}/isbn/${cleanIsbn}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('豆瓣 API 未找到该 ISBN 的书籍信息');
        } else if (response.status === 403) {
          console.warn('豆瓣 API 访问受限，可能需要 API Key');
        }
        return null;
      }
      
      const data: DoubanBookInfo = await response.json();
      
      // 解析价格
      const price = parseFloat(data.price.replace(/[^0-9.]/g, '')) || undefined;
      
      // 处理作者和译者
      const author = Array.isArray(data.author) ? data.author.join(', ') : data.author;
      const translator = data.translator ? data.translator.join(', ') : undefined;

      // 解析出版日期
      let publishDate: string | undefined;
      if (data.pubdate) {
        // 尝试解析各种日期格式
        const dateMatch = data.pubdate.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (dateMatch) {
          publishDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
        } else {
          const yearMatch = data.pubdate.match(/(\d{4})[-/](\d{1,2})/);
          if (yearMatch) {
            publishDate = `${yearMatch[1]}-${yearMatch[2].padStart(2, '0')}`;
          } else if (/^\d{4}$/.test(data.pubdate)) {
            publishDate = `${data.pubdate}-01-01`;
          }
        }
      }

      return {
        title: data.title,
        subtitle: data.subtitle || data.title_origin,
        author,
        translator,
        publisher: data.publisher,
        publishDate,
        isbn: data.isbn13 || data.isbn,
        pageCount: data.pages || undefined,
        price,
        description: data.summary,
        cover: data.image,
      };
    } catch (error) {
      console.error('获取书籍信息失败:', error);
      return null;
    }
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
    const lastChar = chars.pop();
    
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

    // 移除 ISBN-10 的校验位，添加 978 前缀
    const prefix = '978';
    const baseIsbn = cleanIsbn.slice(0, 9);
    const tempIsbn = prefix + baseIsbn;

    // 计算 ISBN-13 校验位
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
      // ISBN-13 格式：XXX-X-XXX-XXXXX-X
      return `${cleanIsbn[0]}-${cleanIsbn[1]}-${cleanIsbn.slice(2, 6)}-${cleanIsbn.slice(6, 11)}-${cleanIsbn[11]}`;
    }
    
    return isbn;
  }
}
