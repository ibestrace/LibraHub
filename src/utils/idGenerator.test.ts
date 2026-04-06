import { describe, it, expect } from 'vitest';
import {
  generateId,
  generateBookId,
  generateMemberId,
  generateMemberTypeId,
  generateBorrowRecordId,
  generateCategoryId,
  generateLogId,
  generateMemberGroupId,
  generateReadingStatId,
  generateBackupId,
  generateBarcode,
  generateCardNumber,
  parseIdTimestamp,
  isValidId,
  createIdGenerator,
  ID_PREFIXES
} from './idGenerator';

describe('ID Generator', () => {
  describe('generateId', () => {
    it('应该生成带前缀和时间戳的 ID', () => {
      const id = generateId('test');
      expect(id).toMatch(/^test_\d+_[a-z0-9]{9}$/);
    });

    it('应该可以生成不带随机部分的 ID', () => {
      const id = generateId('test', false);
      expect(id).toMatch(/^test_\d+$/);
    });

    it('每次生成的 ID 应该唯一', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId('test'));
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('generateBookId', () => {
    it('应该以 book_ 为前缀', () => {
      const id = generateBookId();
      expect(id.startsWith('book_')).toBe(true);
    });

    it('应该符合书籍 ID 格式', () => {
      const id = generateBookId();
      expect(isValidId(id, 'book')).toBe(true);
    });
  });

  describe('generateMemberId', () => {
    it('应该以 member_ 为前缀', () => {
      const id = generateMemberId();
      expect(id.startsWith('member_')).toBe(true);
    });

    it('应该符合会员 ID 格式', () => {
      const id = generateMemberId();
      expect(isValidId(id, 'member')).toBe(true);
    });
  });

  describe('generateMemberTypeId', () => {
    it('应该以 type_ 为前缀', () => {
      const id = generateMemberTypeId();
      expect(id.startsWith('type_')).toBe(true);
    });
  });

  describe('generateBorrowRecordId', () => {
    it('应该以 borrow_ 为前缀', () => {
      const id = generateBorrowRecordId();
      expect(id.startsWith('borrow_')).toBe(true);
    });
  });

  describe('generateCategoryId', () => {
    it('应该以 cat_ 为前缀', () => {
      const id = generateCategoryId();
      expect(id.startsWith('cat_')).toBe(true);
    });
  });

  describe('generateLogId', () => {
    it('应该以 log_ 为前缀', () => {
      const id = generateLogId();
      expect(id.startsWith('log_')).toBe(true);
    });
  });

  describe('generateMemberGroupId', () => {
    it('应该以 group_ 为前缀', () => {
      const id = generateMemberGroupId();
      expect(id.startsWith('group_')).toBe(true);
    });
  });

  describe('generateReadingStatId', () => {
    it('应该以 stat_ 为前缀', () => {
      const id = generateReadingStatId();
      expect(id.startsWith('stat_')).toBe(true);
    });
  });

  describe('generateBackupId', () => {
    it('应该以 backup_ 为前缀', () => {
      const id = generateBackupId();
      expect(id.startsWith('backup_')).toBe(true);
    });

    it('不应该包含随机部分', () => {
      const id = generateBackupId();
      expect(id.match(/_/g)?.length).toBe(1); // 只有一个下划线
    });
  });

  describe('generateBarcode', () => {
    it('应该使用默认前缀 LIB', () => {
      const barcode = generateBarcode();
      expect(barcode.startsWith('LIB-')).toBe(true);
    });

    it('应该接受自定义前缀', () => {
      const barcode = generateBarcode('CUSTOM');
      expect(barcode.startsWith('CUSTOM-')).toBe(true);
    });

    it('应该包含时间戳和随机部分', () => {
      const barcode = generateBarcode();
      const parts = barcode.split('-');
      expect(parts.length).toBe(3);
    });
  });

  describe('generateCardNumber', () => {
    it('应该使用默认前缀 M', () => {
      const cardNumber = generateCardNumber();
      expect(cardNumber.startsWith('M-')).toBe(true);
    });

    it('应该接受自定义前缀', () => {
      const cardNumber = generateCardNumber('VIP');
      expect(cardNumber.startsWith('VIP-')).toBe(true);
    });
  });

  describe('parseIdTimestamp', () => {
    it('应该从 ID 中解析出时间戳', () => {
      const now = Date.now();
      const id = `book_${now}_abc123`;
      const timestamp = parseIdTimestamp(id);
      expect(timestamp).toBe(now);
    });

    it('应该处理不带随机部分的 ID', () => {
      const now = Date.now();
      const id = `backup_${now}`;
      const timestamp = parseIdTimestamp(id);
      expect(timestamp).toBe(now);
    });

    it('应该对无效 ID 返回 null', () => {
      expect(parseIdTimestamp('invalid')).toBeNull();
      expect(parseIdTimestamp('')).toBeNull();
    });
  });

  describe('isValidId', () => {
    it('应该验证有效 ID', () => {
      expect(isValidId('book_1234567890_abc123')).toBe(true);
      expect(isValidId('member_1234567890_xyz789')).toBe(true);
    });

    it('应该验证指定前缀', () => {
      expect(isValidId('book_1234567890_abc123', 'book')).toBe(true);
      expect(isValidId('book_1234567890_abc123', 'member')).toBe(false);
    });

    it('应该拒绝无效 ID', () => {
      expect(isValidId('')).toBe(false);
      expect(isValidId('invalid')).toBe(false);
      expect(isValidId('book_')).toBe(false);
      expect(isValidId(null as any)).toBe(false);
      expect(isValidId(undefined as any)).toBe(false);
    });
  });

  describe('createIdGenerator', () => {
    it('应该创建自定义 ID 生成器', () => {
      const generateCustomId = createIdGenerator('custom');
      const id = generateCustomId();
      expect(id.startsWith('custom_')).toBe(true);
      expect(isValidId(id, 'custom')).toBe(true);
    });

    it('应该支持不带随机部分的生成器', () => {
      const generateSimpleId = createIdGenerator('simple', false);
      const id = generateSimpleId();
      expect(id).toMatch(/^simple_\d+$/);
    });
  });

  describe('ID_PREFIXES', () => {
    it('应该包含所有前缀常量', () => {
      expect(ID_PREFIXES.BOOK).toBe('book');
      expect(ID_PREFIXES.MEMBER).toBe('member');
      expect(ID_PREFIXES.MEMBER_TYPE).toBe('type');
      expect(ID_PREFIXES.BORROW_RECORD).toBe('borrow');
      expect(ID_PREFIXES.CATEGORY).toBe('cat');
      expect(ID_PREFIXES.LOG).toBe('log');
      expect(ID_PREFIXES.MEMBER_GROUP).toBe('group');
      expect(ID_PREFIXES.READING_STAT).toBe('stat');
      expect(ID_PREFIXES.BACKUP).toBe('backup');
    });
  });
});
