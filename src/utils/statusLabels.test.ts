import { describe, it, expect } from 'vitest';
import {
  bookStatusLabels,
  memberStatusLabels,
  borrowStatusLabels,
  getStatusLabel
} from './statusLabels';
import type { BookStatus, MemberStatus, BorrowStatus } from '@/types';

describe('statusLabels', () => {
  describe('bookStatusLabels', () => {
    it('should have all book statuses', () => {
      expect(bookStatusLabels.available).toBeDefined();
      expect(bookStatusLabels.borrowed).toBeDefined();
      expect(bookStatusLabels.reserved).toBeDefined();
      expect(bookStatusLabels.damaged).toBeDefined();
      expect(bookStatusLabels.lost).toBeDefined();
      expect(bookStatusLabels.under_repair).toBeDefined();
    });

    it('should have correct structure for each status', () => {
      Object.values(bookStatusLabels).forEach((label) => {
        expect(label).toHaveProperty('label');
        expect(label).toHaveProperty('color');
        expect(typeof label.label).toBe('string');
        expect(typeof label.color).toBe('string');
      });
    });

    it('should have correct Chinese labels', () => {
      expect(bookStatusLabels.available.label).toBe('可借阅');
      expect(bookStatusLabels.borrowed.label).toBe('已借出');
      expect(bookStatusLabels.damaged.label).toBe('损坏');
    });
  });

  describe('memberStatusLabels', () => {
    it('should have all member statuses', () => {
      expect(memberStatusLabels.active).toBeDefined();
      expect(memberStatusLabels.expired).toBeDefined();
      expect(memberStatusLabels.suspended).toBeDefined();
      expect(memberStatusLabels.cancelled).toBeDefined();
    });

    it('should have correct Chinese labels', () => {
      expect(memberStatusLabels.active.label).toBe('有效');
      expect(memberStatusLabels.expired.label).toBe('已过期');
    });
  });

  describe('borrowStatusLabels', () => {
    it('should have all borrow statuses', () => {
      expect(borrowStatusLabels.borrowed).toBeDefined();
      expect(borrowStatusLabels.returned).toBeDefined();
      expect(borrowStatusLabels.overdue).toBeDefined();
      expect(borrowStatusLabels.renewed).toBeDefined();
    });

    it('should have correct Chinese labels', () => {
      expect(borrowStatusLabels.borrowed.label).toBe('借阅中');
      expect(borrowStatusLabels.returned.label).toBe('已归还');
    });
  });

  describe('getStatusLabel', () => {
    it('should return book status label', () => {
      const result = getStatusLabel('available' as BookStatus, 'book');
      expect(result.label).toBe('可借阅');
    });

    it('should return member status label', () => {
      const result = getStatusLabel('active' as MemberStatus, 'member');
      expect(result.label).toBe('有效');
    });

    it('should return borrow status label', () => {
      const result = getStatusLabel('borrowed' as BorrowStatus, 'borrow');
      expect(result.label).toBe('借阅中');
    });
  });
});
