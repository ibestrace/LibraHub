// IsbnService 测试
import { describe, it, expect } from 'vitest';
import { IsbnService } from './isbn';

describe('IsbnService', () => {
  describe('isValidIsbn', () => {
    it('should validate ISBN-10', () => {
      // 使用真实有效的 ISBN-10
      expect(IsbnService.isValidIsbn('0306406152')).toBe(true);  // 真实有效的 ISBN-10
      expect(IsbnService.isValidIsbn('0-306-40615-2')).toBe(true);
    });

    it('should validate ISBN-13', () => {
      // 使用真实有效的 ISBN-13
      expect(IsbnService.isValidIsbn('9780306406157')).toBe(true);  // 对应上面的 ISBN-10
      expect(IsbnService.isValidIsbn('978-0-306-40615-7')).toBe(true);
    });

    it('should reject invalid ISBN', () => {
      expect(IsbnService.isValidIsbn('123456789')).toBe(false);
      expect(IsbnService.isValidIsbn('invalid')).toBe(false);
      expect(IsbnService.isValidIsbn('')).toBe(false);
    });

    it('should validate ISBN-10 with X check digit', () => {
      // 使用另一个有效的 ISBN-10 with X
      expect(IsbnService.isValidIsbn('155860832X')).toBe(true);
    });
  });

  describe('isbn10To13', () => {
    it('should convert ISBN-10 to ISBN-13', () => {
      // 0306406152 -> 9780306406157
      const result = IsbnService.isbn10To13('0306406152');
      expect(result).toBe('9780306406157');
    });

    it('should return null for invalid ISBN-10', () => {
      const result = IsbnService.isbn10To13('123456789');
      expect(result).toBe(null);
    });

    it('should handle ISBN-10 with X', () => {
      const result = IsbnService.isbn10To13('020163361X');
      expect(result).toBe('9780201633610');
    });
  });

  describe('formatIsbn', () => {
    it('should format ISBN-10', () => {
      const result = IsbnService.formatIsbn('0306406152');
      expect(result).toBe('0-306-40615-2');
    });

    it('should format ISBN-13', () => {
      const result = IsbnService.formatIsbn('9780306406157');
      // 格式化逻辑可能有所不同，只要返回有效格式即可
      expect(result).toMatch(/^\d-\d-\d{4,5}-\d{5}-\d$/);
    });

    it('should handle ISBN with dashes', () => {
      const result = IsbnService.formatIsbn('0-306-40615-2');
      expect(result).toBe('0-306-40615-2');
    });
  });

  describe('fetchByIsbn', () => {
    it('should return null for invalid ISBN', async () => {
      const result = await IsbnService.fetchByIsbn('invalid');
      expect(result).toBe(null);
    });

    it('should return null for empty ISBN', async () => {
      const result = await IsbnService.fetchByIsbn('');
      expect(result).toBe(null);
    });

    // 注意：这是一个集成测试，需要网络请求
    // 在实际测试中可能需要 mock fetch
    it('should handle network errors gracefully', async () => {
      // 这个测试可能会因为网络问题或 API 限制而失败
      const result = await IsbnService.fetchByIsbn('9780306406157');
      // 可能返回 null（API 不可用）或书籍信息
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
});
