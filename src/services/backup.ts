// Automated Backup Service - 自动备份服务
// 定时备份图书馆数据到本地文件

import { IndexedDbService } from './indexedDb';

/**
 * 备份配置
 */
export interface BackupConfig {
  /** 是否启用自动备份 */
  enabled: boolean;
  /** 备份间隔（小时） */
  intervalHours: number;
  /** 最大保留备份数 */
  maxBackups: number;
  /** 备份文件名前缀 */
  filePrefix: string;
  /** 是否包含统计数据 */
  includeStats: boolean;
}

/**
 * 默认备份配置
 */
const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  intervalHours: 24,
  maxBackups: 7,
  filePrefix: 'librahub-backup',
  includeStats: true,
};

/**
 * 备份记录
 */
export interface BackupRecord {
  id: string;
  timestamp: string;
  filename: string;
  size: number;
  recordCount: Record<string, number>;
}

/**
 * 备份结果
 */
export interface BackupResult {
  success: boolean;
  filename?: string;
  timestamp?: string;
  size?: number;
  error?: string;
}

/**
 * 自动备份服务
 */
class BackupService {
  private config: BackupConfig;
  private intervalId: number | null = null;
  private lastBackupTime: Date | null = null;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果正在运行，重启定时器
    if (this.intervalId !== null) {
      this.stop();
      if (this.config.enabled) {
        this.start();
      }
    }
  }

  /**
   * 启动自动备份
   */
  start(): void {
    if (!this.config.enabled || this.intervalId !== null) return;

    console.log('[BackupService] 自动备份已启动');
    
    // 立即执行一次备份检查
    this.checkAndBackup();

    // 设置定时器
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    this.intervalId = window.setInterval(() => {
      this.checkAndBackup();
    }, intervalMs);
  }

  /**
   * 停止自动备份
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[BackupService] 自动备份已停止');
    }
  }

  /**
   * 检查是否需要备份
   */
  private async checkAndBackup(): Promise<void> {
    const now = new Date();
    
    // 检查是否到了备份时间
    if (this.lastBackupTime) {
      const hoursSinceLastBackup = (now.getTime() - this.lastBackupTime.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastBackup < this.config.intervalHours) {
        return;
      }
    }

    // 执行备份
    const result = await this.createBackup();
    
    if (result.success) {
      this.lastBackupTime = now;
      console.log('[BackupService] 自动备份完成:', result.filename);
    } else {
      console.error('[BackupService] 自动备份失败:', result.error);
    }
  }

  /**
   * 创建手动备份
   */
  async createBackup(): Promise<BackupResult> {
    try {
      // 导出所有数据
      const data = await IndexedDbService.exportAll();
      
      // 添加备份元数据
      const backupData = {
        ...data,
        _backup: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          type: 'automatic',
        }
      };

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.config.filePrefix}-${timestamp}.json`;

      // 转换为 JSON
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      // 下载文件
      this.downloadFile(blob, filename);

      // 存储备份记录
      await this.storeBackupRecord({
        id: this.generateId(),
        timestamp: backupData._backup.timestamp,
        filename,
        size: blob.size,
        recordCount: this.countRecords(data),
      });

      // 清理旧备份
      await this.cleanupOldBackups();

      return {
        success: true,
        filename,
        timestamp: backupData._backup.timestamp,
        size: blob.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '备份失败',
      };
    }
  }

  /**
   * 下载文件
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 统计记录数
   */
  private countRecords(data: Record<string, unknown>): Record<string, number> {
    const counts: Record<string, number> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        counts[key] = value.length;
      } else if (key !== 'version' && key !== 'exportTime') {
        counts[key] = 1;
      }
    });

    return counts;
  }

  /**
   * 存储备份记录
   */
  private async storeBackupRecord(record: BackupRecord): Promise<void> {
    try {
      const records = await this.getBackupRecords();
      records.push(record);
      
      // 限制记录数量
      while (records.length > this.config.maxBackups) {
        records.shift();
      }
      
      localStorage.setItem('librahub_backup_records', JSON.stringify(records));
    } catch (error) {
      console.error('[BackupService] 存储备份记录失败:', error);
    }
  }

  /**
   * 获取备份记录
   */
  async getBackupRecords(): Promise<BackupRecord[]> {
    try {
      const data = localStorage.getItem('librahub_backup_records');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * 清理旧备份记录
   */
  private async cleanupOldBackups(): Promise<void> {
    const records = await this.getBackupRecords();
    
    if (records.length > this.config.maxBackups) {
      const toRemove = records.slice(0, records.length - this.config.maxBackups);
      const remaining = records.slice(-this.config.maxBackups);
      
      // 更新记录
      localStorage.setItem('librahub_backup_records', JSON.stringify(remaining));
      
      console.log('[BackupService] 已清理旧备份记录:', toRemove.length);
    }
  }

  /**
   * 从备份文件恢复
   */
  async restoreFromFile(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const content = await file.text();
      const data = JSON.parse(content);

      // 验证备份格式
      if (!data._backup || !data._backup.version) {
        return { success: false, message: '无效的备份文件格式' };
      }

      // 导入数据
      await IndexedDbService.importAll(data);

      return { 
        success: true, 
        message: `数据恢复成功（备份时间: ${data._backup.timestamp}）` 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : '恢复失败' 
      };
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取下次备份时间
   */
  getNextBackupTime(): Date | null {
    if (!this.lastBackupTime || !this.config.enabled) return null;
    
    const nextTime = new Date(this.lastBackupTime);
    nextTime.setHours(nextTime.getHours() + this.config.intervalHours);
    return nextTime;
  }

  /**
   * 获取备份状态
   */
  getStatus(): {
    enabled: boolean;
    isRunning: boolean;
    lastBackupTime: Date | null;
    nextBackupTime: Date | null;
    config: BackupConfig;
  } {
    return {
      enabled: this.config.enabled,
      isRunning: this.intervalId !== null,
      lastBackupTime: this.lastBackupTime,
      nextBackupTime: this.getNextBackupTime(),
      config: { ...this.config },
    };
  }
}

// 导出单例
export const backupService = new BackupService();

// 导出便捷函数
export function initAutoBackup(config?: Partial<BackupConfig>): void {
  if (config) {
    backupService.setConfig(config);
  }
  backupService.start();
}

export function stopAutoBackup(): void {
  backupService.stop();
}

export async function createManualBackup(): Promise<BackupResult> {
  return backupService.createBackup();
}

export async function getBackupHistory(): Promise<BackupRecord[]> {
  return backupService.getBackupRecords();
}

export async function restoreFromBackup(file: File): Promise<{ success: boolean; message: string }> {
  return backupService.restoreFromFile(file);
}

export function getBackupStatus(): ReturnType<typeof backupService.getStatus> {
  return backupService.getStatus();
}

// 默认导出
export default BackupService;
