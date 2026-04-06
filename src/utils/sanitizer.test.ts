import { describe, it, expect } from 'vitest';
import { Sanitizer, sanitizeText, sanitizeHtml, sanitizeSearch } from './sanitizer';

describe('Sanitizer', () => {
  describe('sanitizeText', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(Sanitizer.sanitizeText(input)).toBe('Hello');
    });

    it('should remove HTML tags', () => {
      const input = '<p>Hello <b>World</b></p>';
      expect(Sanitizer.sanitizeText(input)).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(Sanitizer.sanitizeText('')).toBe('');
    });

    it('should handle undefined/null', () => {
      expect(Sanitizer.sanitizeText(undefined as unknown as string)).toBe('');
      expect(Sanitizer.sanitizeText(null as unknown as string)).toBe('');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      expect(Sanitizer.sanitizeText(input)).toBe('Click me');
    });

    it('should preserve plain text', () => {
      const input = 'Hello World 你好世界';
      expect(Sanitizer.sanitizeText(input)).toBe('Hello World 你好世界');
    });
  });

  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <b>World</b></p>';
      expect(Sanitizer.sanitizeHtml(input)).toBe('<p>Hello <b>World</b></p>');
    });

    it('should remove script tags even in HTML mode', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      expect(Sanitizer.sanitizeHtml(input)).toBe('<p>Hello</p>');
    });

    it('should remove dangerous attributes', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = Sanitizer.sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('should allow safe anchor tags', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      expect(Sanitizer.sanitizeHtml(input)).toContain('<a');
      expect(Sanitizer.sanitizeHtml(input)).toContain('href');
    });
  });

  describe('sanitizeSearch', () => {
    it('should remove angle brackets', () => {
      const input = '<script>alert(1)</script>';
      expect(Sanitizer.sanitizeSearch(input)).toBe('scriptalert(1)/script');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert(1)';
      expect(Sanitizer.sanitizeSearch(input)).toBe('alert(1)');
    });

    it('should remove event handlers but keep content', () => {
      const input = 'onclick=alert(1)';
      // 移除 onclick= 后保留 alert(1)
      expect(Sanitizer.sanitizeSearch(input)).toBe('alert(1)');
    });

    it('should preserve normal search terms', () => {
      const input = 'Harry Potter 哈利波特';
      expect(Sanitizer.sanitizeSearch(input)).toBe('Harry Potter 哈利波特');
    });

    it('should trim whitespace', () => {
      const input = '  search term  ';
      expect(Sanitizer.sanitizeSearch(input)).toBe('search term');
    });
  });

  describe('sanitizeBarcode', () => {
    it('should keep alphanumeric characters', () => {
      const input = 'ABC123';
      expect(Sanitizer.sanitizeBarcode(input)).toBe('ABC123');
    });

    it('should keep hyphens and spaces', () => {
      const input = '978-3-16-148410-0';
      expect(Sanitizer.sanitizeBarcode(input)).toBe('978-3-16-148410-0');
    });

    it('should remove special characters (angle brackets)', () => {
      const input = 'ABC<script>123';
      // 移除 <> 后保留 ABCscript123
      expect(Sanitizer.sanitizeBarcode(input)).toBe('ABCscript123');
    });

    it('should trim whitespace', () => {
      const input = '  123456  ';
      expect(Sanitizer.sanitizeBarcode(input)).toBe('123456');
    });
  });

  describe('sanitizeArray', () => {
    it('should sanitize all items in array', () => {
      const inputs = ['<script>1</script>', '<b>2</b>', '3'];
      const result = Sanitizer.sanitizeArray(inputs);
      // sanitizeText 移除所有 HTML 标签及其内容
      expect(result).toEqual(['', '2', '3']);
    });

    it('should handle empty array', () => {
      expect(Sanitizer.sanitizeArray([])).toEqual([]);
    });

    it('should handle non-array input', () => {
      expect(Sanitizer.sanitizeArray(null as unknown as string[])).toEqual([]);
      expect(Sanitizer.sanitizeArray(undefined as unknown as string[])).toEqual([]);
    });
  });

  describe('shortcut functions', () => {
    it('sanitizeText should work as shortcut', () => {
      expect(sanitizeText('<b>Test</b>')).toBe('Test');
    });

    it('sanitizeHtml should work as shortcut', () => {
      expect(sanitizeHtml('<b>Test</b>')).toBe('<b>Test</b>');
    });

    it('sanitizeSearch should work as shortcut', () => {
      expect(sanitizeSearch('<script>')).toBe('script');
    });
  });
});
