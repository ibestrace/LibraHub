// OperatorService 测试 - PBKDF2 哈希
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OperatorService } from './operator';
import { StorageService } from './storage';

describe('OperatorService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('isPasswordSet', () => {
    it('should return false when no password is set', () => {
      expect(OperatorService.isPasswordSet()).toBe(false);
    });

    it('should return true after password is set', async () => {
      await OperatorService.setPassword('test123');
      expect(OperatorService.isPasswordSet()).toBe(true);
    });
  });

  describe('setPassword', () => {
    it('should set password successfully', async () => {
      await expect(OperatorService.setPassword('test123')).resolves.not.toThrow();
      expect(OperatorService.isPasswordSet()).toBe(true);
    });

    it('should throw error when password is too short', async () => {
      await expect(OperatorService.setPassword('12345')).rejects.toThrow('密码长度至少为 6 位');
    });

    it('should store password in PBKDF2 format', async () => {
      await OperatorService.setPassword('test123');
      const stored = StorageService.get<string>('library_operator_password', '');
      // PBKDF2 格式: "pbkdf2_v1:salt:hash"
      expect(stored).toMatch(/^pbkdf2_v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    });

    it('should generate different hashes for same password (random salt)', async () => {
      await OperatorService.setPassword('test123');
      const hash1 = StorageService.get<string>('library_operator_password', '');
      
      localStorage.clear();
      await OperatorService.setPassword('test123');
      const hash2 = StorageService.get<string>('library_operator_password', '');
      
      // 相同的密码应该有不同的哈希（因为使用了随机盐）
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should return false when no password is set', async () => {
      const result = await OperatorService.verify('test123');
      expect(result).toBe(false);
    });

    it('should return true for correct password', async () => {
      await OperatorService.setPassword('test123');
      const result = await OperatorService.verify('test123');
      expect(result).toBe(true);
    });

    it('should return false for wrong password', async () => {
      await OperatorService.setPassword('test123');
      const result = await OperatorService.verify('wrong123');
      expect(result).toBe(false);
    });

    it('should be case sensitive', async () => {
      await OperatorService.setPassword('Test123');
      expect(await OperatorService.verify('test123')).toBe(false);
      expect(await OperatorService.verify('Test123')).toBe(true);
    });
  });

  describe('clearPassword', () => {
    it('should clear the password', async () => {
      await OperatorService.setPassword('test123');
      expect(OperatorService.isPasswordSet()).toBe(true);
      
      OperatorService.clearPassword();
      
      expect(OperatorService.isPasswordSet()).toBe(false);
      expect(await OperatorService.verify('test123')).toBe(false);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      await OperatorService.setPassword('old123');
      
      const result = await OperatorService.changePassword('old123', 'new456');
      expect(result).toBe(true);
      
      expect(await OperatorService.verify('old123')).toBe(false);
      expect(await OperatorService.verify('new456')).toBe(true);
    });

    it('should return false for wrong old password', async () => {
      await OperatorService.setPassword('old123');
      
      const result = await OperatorService.changePassword('wrong123', 'new456');
      expect(result).toBe(false);
      
      expect(await OperatorService.verify('old123')).toBe(true);
    });
  });

  describe('legacy password migration', () => {
    it('should verify and migrate legacy base64 password', async () => {
      // 设置旧版密码格式
      const LEGACY_SALT = 'LibraHub_Salt_2026_v2';
      const password = 'testPassword';
      const legacyHash = btoa(password + LEGACY_SALT);
      
      StorageService.set('library_operator_password', legacyHash);
      StorageService.set('library_operator_password_set', 'true');
      
      // 验证旧密码应该成功
      const result = await OperatorService.verify(password);
      expect(result).toBe(true);
      
      // 验证后应该已迁移到新格式
      const newHash = StorageService.get<string>('library_operator_password', '');
      expect(newHash).not.toBe(legacyHash);
      expect(newHash).toContain('pbkdf2_v1');
    });

    it('should reject incorrect legacy password', async () => {
      const LEGACY_SALT = 'LibraHub_Salt_2026_v2';
      const legacyHash = btoa('correctPassword' + LEGACY_SALT);
      
      StorageService.set('library_operator_password', legacyHash);
      StorageService.set('library_operator_password_set', 'true');
      
      const result = await OperatorService.verify('wrongPassword');
      expect(result).toBe(false);
    });
  });
});
