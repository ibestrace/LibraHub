// ID 生成工具 - 为所有实体提供唯一、类型安全的 ID 生成
// 使用 {prefix}_{timestamp}_{random} 格式，确保全局唯一性

/**
 * ID 前缀常量
 */
export const ID_PREFIXES = {
  BOOK: 'book',
  MEMBER: 'member',
  MEMBER_TYPE: 'type',
  BORROW_RECORD: 'borrow',
  CATEGORY: 'cat',
  LOG: 'log',
  MEMBER_GROUP: 'group',
  READING_STAT: 'stat',
  BACKUP: 'backup'
} as const;

/**
 * 生成随机字符串（Base36）
 * @param length 长度（默认 9）
 * @returns 随机字符串
 */
function generateRandomString(length: number = 9): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * 基础 ID 生成函数
 * @param prefix ID 前缀
 * @param includeRandom 是否包含随机部分（默认 true）
 * @returns 生成的 ID
 */
export function generateId(prefix: string, includeRandom: boolean = true): string {
  const timestamp = Date.now();
  const randomPart = includeRandom ? `_${generateRandomString(9)}` : '';
  return `${prefix}_${timestamp}${randomPart}`;
}

/**
 * 生成书籍 ID
 * @returns book_{timestamp}_{random}
 * @example generateBookId() // "book_1712134567890_a1b2c3d4e"
 */
export function generateBookId(): string {
  return generateId(ID_PREFIXES.BOOK);
}

/**
 * 生成会员 ID
 * @returns member_{timestamp}_{random}
 * @example generateMemberId() // "member_1712134567890_a1b2c3d4e"
 */
export function generateMemberId(): string {
  return generateId(ID_PREFIXES.MEMBER);
}

/**
 * 生成会员类型 ID
 * @returns type_{timestamp}_{random}
 * @example generateMemberTypeId() // "type_1712134567890_a1b2c3d4e"
 */
export function generateMemberTypeId(): string {
  return generateId(ID_PREFIXES.MEMBER_TYPE);
}

/**
 * 生成借阅记录 ID
 * @returns borrow_{timestamp}_{random}
 * @example generateBorrowRecordId() // "borrow_1712134567890_a1b2c3d4e"
 */
export function generateBorrowRecordId(): string {
  return generateId(ID_PREFIXES.BORROW_RECORD);
}

/**
 * 生成分类 ID
 * @returns cat_{timestamp}_{random}
 * @example generateCategoryId() // "cat_1712134567890_a1b2c3d4e"
 */
export function generateCategoryId(): string {
  return generateId(ID_PREFIXES.CATEGORY);
}

/**
 * 生成操作日志 ID
 * @returns log_{timestamp}_{random}
 * @example generateLogId() // "log_1712134567890_a1b2c3d4e"
 */
export function generateLogId(): string {
  return generateId(ID_PREFIXES.LOG);
}

/**
 * 生成分组 ID
 * @returns group_{timestamp}_{random}
 * @example generateMemberGroupId() // "group_1712134567890_a1b2c3d4e"
 */
export function generateMemberGroupId(): string {
  return generateId(ID_PREFIXES.MEMBER_GROUP);
}

/**
 * 生成阅读统计 ID
 * @returns stat_{timestamp}_{random}
 * @example generateReadingStatId() // "stat_1712134567890_a1b2c3d4e"
 */
export function generateReadingStatId(): string {
  return generateId(ID_PREFIXES.READING_STAT);
}

/**
 * 生成备份 ID
 * @returns backup_{timestamp}
 * @example generateBackupId() // "backup_1712134567890"
 */
export function generateBackupId(): string {
  return generateId(ID_PREFIXES.BACKUP, false);
}

/**
 * 生成条形码
 * @param prefix 前缀（默认 'LIB'）
 * @returns 条形码字符串
 * @example generateBarcode() // "LIB-1712134567890-a1b2c"
 */
export function generateBarcode(prefix: string = 'LIB'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomString(4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * 生成会员卡号
 * @param prefix 前缀（默认 'M'）
 * @returns 会员卡号
 * @example generateCardNumber() // "M-1712134567890"
 */
export function generateCardNumber(prefix: string = 'M'): string {
  return `${prefix}-${Date.now()}`;
}

/**
 * 解析 ID 获取时间戳
 * @param id 实体 ID
 * @returns 时间戳或 null（如果解析失败）
 * @example parseIdTimestamp('book_1712134567890_a1b2c3d4e') // 1712134567890
 */
export function parseIdTimestamp(id: string): number | null {
  const match = id.match(/^\w+_(\d+)(?:_[a-z0-9]+)?$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 验证 ID 格式是否有效
 * @param id 要验证的 ID
 * @param expectedPrefix 预期的前缀（可选）
 * @returns 是否有效
 * @example isValidId('book_1712134567890_a1b2c3d4e', 'book') // true
 * @example isValidId('invalid_id') // false
 */
export function isValidId(id: string, expectedPrefix?: string): boolean {
  if (!id || typeof id !== 'string') return false;
  
  // 基础格式：prefix_timestamp[_random]
  const pattern = expectedPrefix 
    ? new RegExp(`^${expectedPrefix}_(\\d+)(?:_[a-z0-9]+)?$`)
    : /^\w+_(\d+)(?:_[a-z0-9]+)?$/;
  
  return pattern.test(id);
}

/**
 * ID 生成器工厂函数
 * 为特定前缀创建专用的 ID 生成函数
 * @param prefix ID 前缀
 * @param includeRandom 是否包含随机部分
 * @returns 专用生成函数
 * @example 
 * const generateCustomId = createIdGenerator('custom');
 * generateCustomId(); // "custom_1712134567890_a1b2c3d4e"
 */
export function createIdGenerator(
  prefix: string, 
  includeRandom: boolean = true
): () => string {
  return () => generateId(prefix, includeRandom);
}

// 默认导出
export default {
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
};
