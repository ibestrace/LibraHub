// PII 加密服务 - 使用 Web Crypto API AES-GCM
// 用于加密敏感个人信息（身份证号、电话、邮箱等）

/**
 * 加密后的数据结构
 */
export interface EncryptedData {
  ciphertext: string;  // Base64 编码的密文
  iv: string;          // Base64 编码的初始化向量
  tag: string;         // Base64 编码的认证标签
}

/**
 * 加密密钥管理
 * 注意：在实际生产环境中，密钥应该更安全地管理
 */
const ENCRYPTION_KEY_STORAGE = 'library_encryption_key';

export class EncryptionService {
  private static key: CryptoKey | null = null;

  /**
   * 初始化或获取加密密钥
   * 使用 AES-GCM 256 位密钥
   */
  static async getKey(): Promise<CryptoKey> {
    if (this.key) return this.key;

    // 尝试从 localStorage 获取已保存的密钥
    const storedKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
    
    if (storedKey) {
      // 导入已有密钥
      const keyBuffer = this.base64ToArrayBuffer(storedKey);
      this.key = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } else {
      // 生成新密钥
      this.key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      
      // 导出并保存密钥
      const exportedKey = await crypto.subtle.exportKey('raw', this.key);
      const keyBase64 = this.arrayBufferToBase64(exportedKey);
      localStorage.setItem(ENCRYPTION_KEY_STORAGE, keyBase64);
    }

    return this.key;
  }

  /**
   * 加密字符串
   * @param plaintext 明文
   * @returns 加密后的数据对象
   */
  static async encrypt(plaintext: string): Promise<EncryptedData> {
    if (!plaintext) return { ciphertext: '', iv: '', tag: '' };

    const key = await this.getKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // 生成随机 IV（96 位是 AES-GCM 推荐值）
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 加密
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // 提取密文和认证标签（最后 16 字节）
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const tagLength = 16;
    const ciphertext = encryptedArray.slice(0, -tagLength);
    const tag = encryptedArray.slice(-tagLength);

    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
      tag: this.arrayBufferToBase64(tag)
    };
  }

  /**
   * 解密字符串
   * @param encryptedData 加密后的数据对象
   * @returns 明文
   */
  static async decrypt(encryptedData: EncryptedData): Promise<string> {
    if (!encryptedData.ciphertext) return '';

    try {
      const key = await this.getKey();

      // 组合密文和认证标签
      const ciphertext = new Uint8Array(this.base64ToArrayBuffer(encryptedData.ciphertext));
      const tag = new Uint8Array(this.base64ToArrayBuffer(encryptedData.tag));
      const iv = new Uint8Array(this.base64ToArrayBuffer(encryptedData.iv));

      const combined = new Uint8Array(ciphertext.length + tag.length);
      combined.set(ciphertext, 0);
      combined.set(tag, ciphertext.length);

      // 解密
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        combined
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('解密失败:', error);
      throw new Error('解密失败，数据可能已被篡改');
    }
  }

  /**
   * 批量加密对象的敏感字段
   * @param data 原始数据对象
   * @param fields 需要加密的字段名数组
   * @returns 加密后的数据对象
   */
  static async encryptFields<T extends Record<string, unknown>>(
    data: T,
    fields: Array<keyof T>
  ): Promise<T> {
    const encrypted = { ...data } as T;

    for (const field of fields) {
      const value = data[field];
      if (typeof value === 'string' && value) {
        const encryptedValue = await this.encrypt(value);
        (encrypted as Record<string, unknown>)[field as string] = encryptedValue;
      }
    }

    return encrypted;
  }

  /**
   * 批量解密对象的敏感字段
   * @param data 加密后的数据对象
   * @param fields 需要解密的字段名数组
   * @returns 解密后的数据对象
   */
  static async decryptFields<T extends Record<string, unknown>>(
    data: T,
    fields: Array<keyof T>
  ): Promise<T> {
    const decrypted = { ...data } as T;

    for (const field of fields) {
      const value = data[field];
      if (value && typeof value === 'object' && 'ciphertext' in (value as Record<string, unknown>)) {
        (decrypted as Record<string, unknown>)[field as string] = await this.decrypt(value as unknown as EncryptedData);
      }
    }

    return decrypted;
  }

  /**
   * ArrayBuffer 转 Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Base64 转 ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * 清除加密密钥（用于重置）
   */
  static clearKey(): void {
    this.key = null;
    localStorage.removeItem(ENCRYPTION_KEY_STORAGE);
  }

  /**
   * 检查数据是否已加密
   */
  static isEncrypted(value: unknown): value is EncryptedData {
    return (
      typeof value === 'object' &&
      value !== null &&
      'ciphertext' in value &&
      'iv' in value &&
      'tag' in value
    );
  }
}

// ==================== Member 数据加密/解密辅助函数 ====================

import type { Member } from '@/types';

/**
 * 需要加密的 Member 字段
 */
export const MEMBER_SENSITIVE_FIELDS = [
  'idCard',    // 身份证号
  'phone',     // 电话
  'email',     // 邮箱
  'address',   // 地址
] as const;

/**
 * 加密 Member 的敏感字段
 */
export async function encryptMember(member: Member): Promise<Member> {
  return EncryptionService.encryptFields(member as unknown as Record<string, unknown>, MEMBER_SENSITIVE_FIELDS as unknown as Array<keyof Record<string, unknown>>) as unknown as Member;
}

/**
 * 解密 Member 的敏感字段
 */
export async function decryptMember(member: Member): Promise<Member> {
  return EncryptionService.decryptFields(member as unknown as Record<string, unknown>, MEMBER_SENSITIVE_FIELDS as unknown as Array<keyof Record<string, unknown>>) as unknown as Member;
}

/**
 * 批量解密 Member 列表
 */
export async function decryptMembers(members: Member[]): Promise<Member[]> {
  return Promise.all(members.map(decryptMember));
}
