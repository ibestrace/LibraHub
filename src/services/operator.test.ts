// OperatorService 测试
import { describe, it, expect, beforeEach } from 'vitest';
import { OperatorService } from './operator';

describe('OperatorService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('isPasswordSet', () => {
    it('should return false when no password is set', () => {
      expect(OperatorService.isPasswordSet()).toBe(false);
    });

    it('should return true after password is set', () => {
      OperatorService.setPassword('test123');
      expect(OperatorService.isPasswordSet()).toBe(true);
    });
  });

  describe('setPassword', () => {
    it('should set password successfully', () => {
      expect(() => OperatorService.setPassword('test123')).not.toThrow();
      expect(OperatorService.isPasswordSet()).toBe(true);
    });

    it('should throw error when password is too short', () => {
      expect(() => OperatorService.setPassword('12345')).toThrow('密码长度至少为 6 位');
    });

    it('should hash the password', () => {
      OperatorService.setPassword('test123');
      // 密码应该被哈希存储，不是明文
      const stored = localStorage.getItem('library_operator_password');
      expect(stored).not.toBe('test123');
    });
  });

  describe('verify', () => {
    it('should return false when no password is set', () => {
      expect(OperatorService.verify('test123')).toBe(false);
    });

    it('should return true for correct password', () => {
      OperatorService.setPassword('test123');
      expect(OperatorService.verify('test123')).toBe(true);
    });

    it('should return false for wrong password', () => {
      OperatorService.setPassword('test123');
      expect(OperatorService.verify('wrong123')).toBe(false);
    });

    it('should be case sensitive', () => {
      OperatorService.setPassword('Test123');
      expect(OperatorService.verify('test123')).toBe(false);
      expect(OperatorService.verify('Test123')).toBe(true);
    });
  });

  describe('clearPassword', () => {
    it('should clear the password', () => {
      OperatorService.setPassword('test123');
      expect(OperatorService.isPasswordSet()).toBe(true);
      
      OperatorService.clearPassword();
      expect(OperatorService.isPasswordSet()).toBe(false);
      expect(OperatorService.verify('test123')).toBe(false);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', () => {
      OperatorService.setPassword('old123');
      
      const result = OperatorService.changePassword('old123', 'new456');
      expect(result).toBe(true);
      
      expect(OperatorService.verify('old123')).toBe(false);
      expect(OperatorService.verify('new456')).toBe(true);
    });

    it('should return false for wrong old password', () => {
      OperatorService.setPassword('old123');
      
      const result = OperatorService.changePassword('wrong123', 'new456');
      expect(result).toBe(false);
      
      expect(OperatorService.verify('old123')).toBe(true);
    });
  });
});
