// 管理员操作验证服务
import { StorageService } from './storage';

const OPERATOR_KEY = 'library_operator_password';
const OPERATOR_SET_KEY = 'library_operator_password_set';

export class OperatorService {
  // 简单哈希加密（生产环境建议使用 bcrypt）
  private static hash(password: string): string {
    // 使用简单的 SHA-256 哈希（通过 Web Crypto API）
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'LibraHub_Salt_2026');
    
    // 使用简单的哈希算法
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16) + 'LibraHub';
  }

  // 设置管理员密码
  static setPassword(password: string): void {
    if (password.length < 6) {
      throw new Error('密码长度至少为 6 位');
    }
    const hashed = this.hash(password);
    StorageService.set(OPERATOR_KEY, hashed);
    StorageService.set(OPERATOR_SET_KEY, 'true');  // 存储字符串'true'
  }

  // 验证密码
  static verify(password: string): boolean {
    const stored = StorageService.get<string | null>(OPERATOR_KEY, null);
    if (!stored) return false;
    return this.hash(password) === stored;
  }

  // 检查是否已设置密码
  static isPasswordSet(): boolean {
    const stored = StorageService.get<string>(OPERATOR_SET_KEY, '');
    return stored === 'true';
  }

  // 清除密码（用于重置）
  static clearPassword(): void {
    StorageService.remove(OPERATOR_KEY);
    StorageService.remove(OPERATOR_SET_KEY);
  }

  // 修改密码
  static changePassword(oldPassword: string, newPassword: string): boolean {
    if (!this.verify(oldPassword)) {
      return false;
    }
    this.setPassword(newPassword);
    return true;
  }
}
