// Data Migration Service - 数据迁移服务
// 负责从 localStorage 迁移数据到 IndexedDB
// 支持渐进式迁移、数据验证和回滚

import { IndexedDbService, STORES } from './indexedDb';
import type { SystemSettings } from '@/types';

// localStorage 键名映射
const LEGACY_STORAGE_KEYS = {
  BOOKS: 'library_books',
  MEMBERS: 'library_members',
  MEMBER_TYPES: 'library_member_types',
  BORROW_RECORDS: 'library_borrow_records',
  RESERVATIONS: 'library_reservations',
  CATEGORIES: 'library_categories',
  LOGS: 'library_logs',
  SETTINGS: 'library_settings',
  OPERATORS: 'library_operators',
  MEMBER_GROUPS: 'library_member_groups',
  READING_STATS: 'library_reading_stats'
} as const;

/**
 * 迁移进度
 */
export interface MigrationProgress {
  /** 总实体数 */
  totalEntities: number;
  /** 已处理实体数 */
  processedEntities: number;
  /** 当前处理的实体 */
  currentEntity: string;
  /** 成功迁移的记录数 */
  migratedCount: number;
  /** 跳过的记录数 */
  skippedCount: number;
  /** 失败的记录数 */
  failedCount: number;
  /** 是否完成 */
  isComplete: boolean;
  /** 错误信息 */
  errors: string[];
}

/**
 * 迁移结果
 */
export interface MigrationResult {
  /** 是否成功 */
  success: boolean;
  /** 迁移时间戳 */
  timestamp: string;
  /** 各实体的迁移详情 */
  details: Record<string, {
    total: number;
    migrated: number;
    skipped: number;
    failed: number;
  }>;
  /** 错误列表 */
  errors: string[];
  /** 是否已回滚 */
  rolledBack: boolean;
}

/**
 * 迁移配置
 */
export interface MigrationConfig {
  /** 是否验证数据 */
  validateData?: boolean;
  /** 是否跳过已存在的数据 */
  skipExisting?: boolean;
  /** 批量处理大小 */
  batchSize?: number;
  /** 是否保留 localStorage 数据 */
  preserveSource?: boolean;
  /** 进度回调 */
  onProgress?: (progress: MigrationProgress) => void;
}

/**
 * 默认迁移配置
 */
const DEFAULT_CONFIG: Required<MigrationConfig> = {
  validateData: true,
  skipExisting: true,
  batchSize: 100,
  preserveSource: true,
  onProgress: () => {},
};

/**
 * 数据迁移服务
 */
export class MigrationService {
  private config: Required<MigrationConfig>;
  private progress: MigrationProgress;
  private abortController: AbortController | null = null;

  constructor(config: MigrationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.progress = this.initProgress();
  }

  /**
   * 检查是否需要迁移
   */
  static async checkMigrationNeeded(): Promise<{
    needed: boolean;
    localStorageData: Record<string, number>;
    indexedDbData: Record<string, number>;
  }> {
    const localStorageData: Record<string, number> = {};
    const indexedDbData: Record<string, number> = {};

    // 检查 localStorage
    for (const [key, storageKey] of Object.entries(LEGACY_STORAGE_KEYS)) {
      const data = localStorage.getItem(storageKey);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          localStorageData[key] = Array.isArray(parsed) ? parsed.length : 1;
        } catch {
          localStorageData[key] = 0;
        }
      }
    }

    // 检查 IndexedDB
    try {
      const stats = await IndexedDbService.getStats();
      Object.entries(stats).forEach(([key, count]) => {
        indexedDbData[key] = count;
      });
    } catch {
      // IndexedDB 可能未初始化
    }

    const hasLocalStorageData = Object.values(localStorageData).some(count => count > 0);
    const hasIndexedDbData = Object.values(indexedDbData).some(count => count > 0);

    return {
      needed: hasLocalStorageData && !hasIndexedDbData,
      localStorageData,
      indexedDbData,
    };
  }

  /**
   * 初始化进度
   */
  private initProgress(): MigrationProgress {
    return {
      totalEntities: Object.keys(LEGACY_STORAGE_KEYS).length,
      processedEntities: 0,
      currentEntity: '',
      migratedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      isComplete: false,
      errors: [],
    };
  }

  /**
   * 从 localStorage 读取数据
   */
  private readFromLocalStorage<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error(`读取 localStorage 失败: ${key}`, error);
      return [];
    }
  }

  /**
   * 验证数据完整性
   */
  private validateItem<T>(item: T, requiredFields: string[]): boolean {
    if (!item || typeof item !== 'object') return false;
    
    return requiredFields.every(field => {
      const value = (item as any)[field];
      return value !== undefined && value !== null;
    });
  }

  /**
   * 更新进度
   */
  private updateProgress(update: Partial<MigrationProgress>) {
    this.progress = { ...this.progress, ...update };
    this.config.onProgress({ ...this.progress });
  }

  /**
   * 检查是否已中止
   */
  private checkAborted(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }

  /**
   * 迁移单个实体
   */
  private async migrateEntity<T extends { id: string }>(
    entityName: string,
    storageKey: string,
    storeName: keyof typeof STORES,
    requiredFields: string[]
  ): Promise<{ migrated: number; skipped: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    this.updateProgress({ currentEntity: entityName });

    // 读取数据
    const items = this.readFromLocalStorage<T>(storageKey);
    
    if (items.length === 0) {
      return { migrated: 0, skipped: 0, failed: 0, errors: [] };
    }

    // 获取已存在的 ID
    let existingIds = new Set<string>();
    if (this.config.skipExisting) {
      try {
        const existing = await IndexedDbService.getAll<T>(storeName);
        existingIds = new Set(existing.map(item => item.id));
      } catch {
        // 忽略错误
      }
    }

    // 批量处理
    const batch: T[] = [];
    
    for (const item of items) {
      if (this.checkAborted()) {
        throw new Error('迁移已中止');
      }

      // 验证数据
      if (this.config.validateData && !this.validateItem(item, requiredFields)) {
        failed++;
        errors.push(`${entityName}: 数据验证失败 ID=${item.id || 'unknown'}`);
        continue;
      }

      // 检查是否已存在
      if (this.config.skipExisting && existingIds.has(item.id)) {
        skipped++;
        continue;
      }

      batch.push(item);

      // 批量写入
      if (batch.length >= this.config.batchSize) {
        try {
          await IndexedDbService.bulkPut(storeName, batch);
          migrated += batch.length;
          batch.length = 0;
        } catch (error) {
          failed += batch.length;
          errors.push(`${entityName}: 批量写入失败 ${error}`);
          batch.length = 0;
        }
      }
    }

    // 处理剩余数据
    if (batch.length > 0) {
      try {
        await IndexedDbService.bulkPut(storeName, batch);
        migrated += batch.length;
      } catch (error) {
        failed += batch.length;
        errors.push(`${entityName}: 批量写入失败 ${error}`);
      }
    }

    return { migrated, skipped, failed, errors };
  }

  /**
   * 执行完整迁移
   */
  async migrate(): Promise<MigrationResult> {
    this.abortController = new AbortController();
    const details: MigrationResult['details'] = {};
    const allErrors: string[] = [];

    try {
      // 初始化 IndexedDB
      await IndexedDbService.init();

      // 定义实体映射
      const entityMappings = [
        {
          name: '书籍',
          key: LEGACY_STORAGE_KEYS.BOOKS,
          store: 'BOOKS' as const,
          fields: ['id', 'barcode', 'title', 'author', 'categoryId', 'status', 'totalStock', 'availableStock'],
        },
        {
          name: '会员',
          key: LEGACY_STORAGE_KEYS.MEMBERS,
          store: 'MEMBERS' as const,
          fields: ['id', 'cardNumber', 'name', 'phone', 'memberType', 'status'],
        },
        {
          name: '会员类型',
          key: LEGACY_STORAGE_KEYS.MEMBER_TYPES,
          store: 'MEMBER_TYPES' as const,
          fields: ['id', 'name', 'durationMonths', 'maxBorrowCount'],
        },
        {
          name: '借阅记录',
          key: LEGACY_STORAGE_KEYS.BORROW_RECORDS,
          store: 'BORROW_RECORDS' as const,
          fields: ['id', 'bookId', 'memberId', 'borrowDate', 'dueDate', 'status'],
        },
        {
          name: '书籍分类',
          key: LEGACY_STORAGE_KEYS.CATEGORIES,
          store: 'CATEGORIES' as const,
          fields: ['id', 'name'],
        },
        {
          name: '会员分组',
          key: LEGACY_STORAGE_KEYS.MEMBER_GROUPS,
          store: 'MEMBER_GROUPS' as const,
          fields: ['id', 'name'],
        },
        {
          name: '阅读统计',
          key: LEGACY_STORAGE_KEYS.READING_STATS,
          store: 'READING_STATS' as const,
          fields: ['id'],
        },
        {
          name: '操作日志',
          key: LEGACY_STORAGE_KEYS.LOGS,
          store: 'LOGS' as const,
          fields: ['id', 'type', 'action', 'targetId'],
        },
      ];

      // 迁移各实体
      for (const mapping of entityMappings) {
        if (this.checkAborted()) {
          throw new Error('迁移已中止');
        }

        const result = await this.migrateEntity(
          mapping.name,
          mapping.key,
          mapping.store,
          mapping.fields
        );

        details[mapping.name] = {
          total: result.migrated + result.skipped + result.failed,
          migrated: result.migrated,
          skipped: result.skipped,
          failed: result.failed,
        };

        allErrors.push(...result.errors);

        this.updateProgress({
          processedEntities: this.progress.processedEntities + 1,
          migratedCount: this.progress.migratedCount + result.migrated,
          skippedCount: this.progress.skippedCount + result.skipped,
          failedCount: this.progress.failedCount + result.failed,
          errors: [...this.progress.errors, ...result.errors],
        });
      }

      // 迁移系统设置
      const settings = this.readFromLocalStorage<SystemSettings>(LEGACY_STORAGE_KEYS.SETTINGS);
      if (settings.length > 0) {
        try {
          const setting = settings[0];
          await IndexedDbService.add('SETTINGS', { ...setting, id: 'default' });
          details['系统设置'] = { total: 1, migrated: 1, skipped: 0, failed: 0 };
          this.updateProgress({
            processedEntities: this.progress.processedEntities + 1,
            migratedCount: this.progress.migratedCount + 1,
          });
        } catch {
          details['系统设置'] = { total: 1, migrated: 0, skipped: 0, failed: 1 };
          this.updateProgress({
            processedEntities: this.progress.processedEntities + 1,
            failedCount: this.progress.failedCount + 1,
          });
        }
      }

      // 标记完成
      this.updateProgress({ isComplete: true });

      // 清理 localStorage（如果配置为不保留）
      if (!this.config.preserveSource) {
        this.clearLocalStorage();
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        details,
        errors: allErrors,
        rolledBack: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      allErrors.push(`迁移失败: ${errorMessage}`);

      return {
        success: false,
        timestamp: new Date().toISOString(),
        details,
        errors: allErrors,
        rolledBack: false,
      };
    }
  }

  /**
   * 中止迁移
   */
  abort() {
    this.abortController?.abort();
  }

  /**
   * 清理 localStorage
   */
  clearLocalStorage(): void {
    Object.values(LEGACY_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * 回滚迁移（清空 IndexedDB）
   */
  async rollback(): Promise<boolean> {
    try {
      await IndexedDbService.clearAll();
      return true;
    } catch (error) {
      console.error('回滚失败:', error);
      return false;
    }
  }
}

/**
 * 便捷的迁移函数
 */
export async function migrateFromLocalStorage(
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  const service = new MigrationService({ onProgress });
  return service.migrate();
}

/**
 * 检查是否需要迁移
 */
export async function checkMigrationStatus(): Promise<{
  needed: boolean;
  localStorageData: Record<string, number>;
  indexedDbData: Record<string, number>;
}> {
  return MigrationService.checkMigrationNeeded();
}

/**
 * 导出 localStorage 数据为 JSON
 */
export function exportLocalStorageData(): string {
  const data: Record<string, unknown> = {};
  
  Object.entries(LEGACY_STORAGE_KEYS).forEach(([key, storageKey]) => {
    const value = localStorage.getItem(storageKey);
    if (value) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    }
  });

  return JSON.stringify({
    version: '1.0',
    exportTime: new Date().toISOString(),
    data,
  }, null, 2);
}

// 导出单例
export const migrationService = new MigrationService();
