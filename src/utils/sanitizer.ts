import DOMPurify from 'dompurify';

/**
 * XSS 防护工具类
 * 使用 DOMPurify 净化用户输入
 */
export class Sanitizer {
  /**
   * 严格模式：清除所有 HTML 标签
   * 用于普通文本字段（姓名、备注、描述等）
   */
  static sanitizeText(input: string): string {
    if (!input) return '';
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  }

  /**
   * 富文本模式：允许有限的 HTML 标签
   * 用于可能需要格式的字段
   */
  static sanitizeHtml(input: string): string {
    if (!input) return '';
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
      ALLOW_DATA_ATTR: false
    });
  }

  /**
   * 搜索关键词净化
   * 移除可能导致 XSS 的字符，但保留搜索功能
   */
  static sanitizeSearch(input: string): string {
    if (!input) return '';
    // 仅移除危险字符，保留搜索语义
    return input
      .replace(/[<>]/g, '')  // 移除尖括号
      .replace(/javascript:/gi, '')  // 移除 javascript: 协议
      .replace(/on\w+=/gi, '')  // 移除事件处理器
      .trim();
  }

  /**
   * 条形码/ISBN 净化
   * 仅保留字母数字和常见分隔符
   */
  static sanitizeBarcode(input: string): string {
    if (!input) return '';
    return input.replace(/[^a-zA-Z0-9\-\s]/g, '').trim();
  }

  /**
   * 数组净化
   * 对字符串数组中的每个元素进行净化
   */
  static sanitizeArray(inputs: string[], mode: 'text' | 'html' = 'text'): string[] {
    if (!Array.isArray(inputs)) return [];
    const sanitizer = mode === 'html' ? this.sanitizeHtml : this.sanitizeText;
    return inputs.map(item => sanitizer(item));
  }
}

/**
 * 快捷函数：净化文本
 */
export const sanitizeText = (input: string): string => Sanitizer.sanitizeText(input);

/**
 * 快捷函数：净化 HTML
 */
export const sanitizeHtml = (input: string): string => Sanitizer.sanitizeHtml(input);

/**
 * 快捷函数：净化搜索
 */
export const sanitizeSearch = (input: string): string => Sanitizer.sanitizeSearch(input);
