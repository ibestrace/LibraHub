// 管理员操作验证服务 - 使用 PBKDF2 安全哈希
import { StorageService } from './storage';

const OPERATOR_KEY = 'library_operator_password';
const OPERATOR_SET_KEY = 'library_operator_password_set';
const HASH_VERSION_KEY = 'library_operator_hash_version';

// 哈希版本标记
const HASH_VERSION = 'pbkdf2_v1';

export class OperatorService {
  // PBKDF2 配置
  private static readonly ITERATIONS = 100000; // OWASP 推荐
  private static readonly KEY_LENGTH = 256; // 位
  private static readonly HASH_ALGORITHM = 'SHA-256';

  /**
   * 生成密码哈希 (PBKDF2)
   * 返回格式: "version:salt:hash" (Base64)
   */
  private static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    
    // 生成随机盐值 (16字节)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // 导入密码为 CryptoKey
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // PBKDF2 派生密钥
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: this.HASH_ALGORITHM,
      },
      keyMaterial,
      this.KEY_LENGTH
    );
    
    // 转换为 Base64
    const saltBase64 = this.arrayBufferToBase64(salt);
    const hashBase64 = this.arrayBufferToBase64(new Uint8Array(derivedBits));
    
    return `${HASH_VERSION}:${saltBase64}:${hashBase64}`;
  }

  /**
   * 验证密码
   */
  private static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      const parts = storedHash.split(':');
      
      // 检查哈希版本
      if (parts.length !== 3 || parts[0] !== HASH_VERSION) {
        // 旧版格式，返回 false 触发迁移
        return false;
      }
      
      const saltBase64 = parts[1];
      const expectedHashBase64 = parts[2];
      
      const encoder = new TextEncoder();
      const salt = this.base64ToArrayBuffer(saltBase64);
      
      // 重新计算哈希
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.ITERATIONS,
          hash: this.HASH_ALGORITHM,
        },
        keyMaterial,
        this.KEY_LENGTH
      );
      
      const computedHashBase64 = this.arrayBufferToBase64(new Uint8Array(derivedBits));
      
      // 时序安全比较
      return this.timingSafeEqual(computedHashBase64, expectedHashBase64);
    } catch {
      return false;
    }
  }

  /**
   * 检查是否为旧版 Base64 格式（用于迁移）
   */
  private static isLegacyHash(stored: string): boolean {
    if (!stored) return false;
    // 新版格式包含版本前缀
    return !stored.startsWith(HASH_VERSION + ':');
  }

  /**
   * 验证旧版密码 (Base64 + 固定 salt) - 仅用于迁移
   */
  private static verifyLegacy(password: string, stored: string): boolean {
    const LEGACY_SALT = 'LibraHub_Salt_2026_v2';
    const hashed = btoa(password + LEGACY_SALT);
    return this.timingSafeEqual(hashed, stored);
  }

  /**
   * 时序安全的字符串比较
   * 防止时序攻击（Timing Attack）
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * ArrayBuffer 转 Base64
   */
  private static arrayBufferToBase64(buffer: Uint8Array): string {
    const bytes = new Uint8Array(buffer);
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
   * 设置管理员密码
   */
  static async setPassword(password: string): Promise<void> {
    if (password.length < 6) {
      throw new Error('密码长度至少为 6 位');
    }
    
    const hashed = await this.hashPassword(password);
    StorageService.set(OPERATOR_KEY, hashed);
    StorageService.set(OPERATOR_SET_KEY, 'true');
    StorageService.set(HASH_VERSION_KEY, HASH_VERSION);
  }

  /**
   * 验证密码（支持自动迁移旧版密码）
   */
  static async verify(password: string): Promise<boolean> {
    const stored = StorageService.get<string | null>(OPERATOR_KEY, null);
    if (!stored) return false;
    
    // 检查是否为旧版格式
    if (this.isLegacyHash(stored)) {
      const isValid = this.verifyLegacy(password, stored);
      if (isValid) {
        // 自动迁移到新格式
        await this.setPassword(password);
      }
      return isValid;
    }
    
    return await this.verifyPassword(password, stored);
  }

  /**
   * 检查是否已设置密码
   */
  static isPasswordSet(): boolean {
    const stored = StorageService.get<string>(OPERATOR_SET_KEY, '');
    return stored === 'true';
  }

  /**
   * 清除密码（用于重置）
   */
  static clearPassword(): void {
    StorageService.remove(OPERATOR_KEY);
    StorageService.remove(OPERATOR_SET_KEY);
    StorageService.remove(HASH_VERSION_KEY);
  }

  /**
   * 修改密码
   */
  static async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    const isValid = await this.verify(oldPassword);
    if (!isValid) {
      return false;
    }
    await this.setPassword(newPassword);
    return true;
  }
}
