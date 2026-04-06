import { describe, it, expect, beforeEach } from 'vitest';
import { EncryptionService, encryptMember, decryptMember } from './encryption';
import type { Member } from '@/types';

describe('EncryptionService', () => {
  beforeEach(() => {
    // 清除密钥
    EncryptionService.clearKey();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', async () => {
      const plaintext = 'Hello World 你好世界';
      const encrypted = await EncryptionService.encrypt(plaintext);
      
      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.tag).toBeTruthy();
      
      const decrypted = await EncryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should return empty object for empty string', async () => {
      const encrypted = await EncryptionService.encrypt('');
      expect(encrypted.ciphertext).toBe('');
      expect(encrypted.iv).toBe('');
      expect(encrypted.tag).toBe('');
    });

    it('should return empty string for empty encrypted data', async () => {
      const decrypted = await EncryptionService.decrypt({ ciphertext: '', iv: '', tag: '' });
      expect(decrypted).toBe('');
    });

    it('should generate different ciphertext for same plaintext', async () => {
      const plaintext = 'test';
      const encrypted1 = await EncryptionService.encrypt(plaintext);
      const encrypted2 = await EncryptionService.encrypt(plaintext);
      
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should throw error for tampered data', async () => {
      const plaintext = 'test';
      const encrypted = await EncryptionService.encrypt(plaintext);
      
      // 篡改密文
      encrypted.ciphertext = encrypted.ciphertext.slice(0, -4) + 'aaaa';
      
      await expect(EncryptionService.decrypt(encrypted)).rejects.toThrow('解密失败');
    });
  });

  describe('encryptFields/decryptFields', () => {
    it('should encrypt and decrypt specified fields', async () => {
      const data = {
        name: '张三',
        phone: '13800138000',
        email: 'test@example.com',
        age: 25
      };
      
      const encrypted = await EncryptionService.encryptFields(data, ['phone', 'email']);
      
      expect(encrypted.name).toBe('张三');
      expect(encrypted.age).toBe(25);
      expect(typeof encrypted.phone).toBe('object');
      expect(typeof encrypted.email).toBe('object');
      
      const decrypted = await EncryptionService.decryptFields(encrypted, ['phone', 'email']);
      expect(decrypted.phone).toBe('13800138000');
      expect(decrypted.email).toBe('test@example.com');
    });

    it('should skip empty values', async () => {
      const data = {
        name: '张三',
        phone: '',
        email: null as unknown as string
      };
      
      const encrypted = await EncryptionService.encryptFields(data, ['phone', 'email']);
      expect(encrypted.phone).toBe('');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted data', () => {
      const encryptedData = {
        ciphertext: 'abc',
        iv: 'def',
        tag: 'ghi'
      };
      expect(EncryptionService.isEncrypted(encryptedData)).toBe(true);
    });

    it('should return false for non-encrypted data', () => {
      expect(EncryptionService.isEncrypted('string')).toBe(false);
      expect(EncryptionService.isEncrypted(123)).toBe(false);
      expect(EncryptionService.isEncrypted({})).toBe(false);
      expect(EncryptionService.isEncrypted(null)).toBe(false);
    });
  });

  describe('Member encryption', () => {
    it('should encrypt and decrypt member sensitive fields', async () => {
      const member: Member = {
        id: 'test-id',
        cardNumber: 'M001',
        name: '张三',
        phone: '13800138000',
        email: 'zhangsan@example.com',
        address: '北京市',
        idCard: '11010119900101xxxx',
        memberType: {
          id: 'type1',
          name: '普通会员',
          durationMonths: 12,
          maxBorrowCount: 5,
          maxBorrowDays: 30,
          renewTimes: 2,
          renewDays: 15,
          depositAmount: 100,
          fee: 50,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        status: 'active',
        registerDate: new Date().toISOString(),
        expireDate: new Date().toISOString(),
        maxBorrowCount: 5,
        currentBorrowCount: 0,
        totalReadingWords: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const encrypted = await encryptMember(member);
      
      // 敏感字段应该是加密后的对象
      expect(typeof encrypted.phone).toBe('object');
      expect(typeof encrypted.email).toBe('object');
      expect(typeof encrypted.address).toBe('object');
      expect(typeof encrypted.idCard).toBe('object');
      
      // 非敏感字段应该保持不变
      expect(encrypted.name).toBe('张三');
      expect(encrypted.cardNumber).toBe('M001');
      
      const decrypted = await decryptMember(encrypted);
      expect(decrypted.phone).toBe('13800138000');
      expect(decrypted.email).toBe('zhangsan@example.com');
      expect(decrypted.address).toBe('北京市');
      expect(decrypted.idCard).toBe('11010119900101xxxx');
    });
  });
});
