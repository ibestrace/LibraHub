import { useState, useEffect, useCallback } from 'react';

interface StorageStats {
  used: number;           // 已使用字节
  available: number;      // 可用字节
  percentUsed: number;    // 使用百分比
  itemSize: Record<string, number>; // 各项数据大小
  itemCount: number;      // 项目数量
}

type WarningLevel = 'low' | 'medium' | 'high' | 'critical' | null;

export function useStorageMonitor() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [warning, setWarning] = useState<WarningLevel>(null);

  // localStorage 限制约 5MB（不同浏览器略有差异）
  const STORAGE_LIMIT = 5 * 1024 * 1024;

  const calculateStorage = useCallback(() => {
    let total = 0;
    const itemSize: Record<string, number> = {};
    let itemCount = 0;
    
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        try {
          const value = localStorage.getItem(key) || '';
          const size = new Blob([value]).size;
          itemSize[key] = size;
          total += size;
          itemCount++;
        } catch (e) {
          console.warn(`Failed to calculate size for key: ${key}`);
        }
      }
    }

    const available = Math.max(0, STORAGE_LIMIT - total);
    const percentUsed = (total / STORAGE_LIMIT) * 100;

    // 设置警告级别
    let newWarning: WarningLevel = null;
    if (percentUsed > 90) {
      newWarning = 'critical';
    } else if (percentUsed > 75) {
      newWarning = 'high';
    } else if (percentUsed > 50) {
      newWarning = 'medium';
    } else if (percentUsed > 30) {
      newWarning = 'low';
    }

    setWarning(newWarning);
    setStats({
      used: total,
      available,
      percentUsed,
      itemSize,
      itemCount,
    });
  }, []);

  useEffect(() => {
    calculateStorage();
    
    // 定期检查（每分钟）
    const interval = setInterval(calculateStorage, 60000);
    return () => clearInterval(interval);
  }, [calculateStorage]);

  const formatSize = useCallback((bytes: number): string => {
    if (bytes < 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, []);

  const formatLimit = useCallback((): string => {
    return formatSize(STORAGE_LIMIT);
  }, [formatSize]);

  const getWarningColor = useCallback((level: WarningLevel): string => {
    switch (level) {
      case 'critical':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-green-700 bg-green-50 border-green-200';
    }
  }, []);

  const getWarningIcon = useCallback((level: WarningLevel): string => {
    switch (level) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '✅';
    }
  }, []);

  const getWarningMessage = useCallback((level: WarningLevel): string => {
    switch (level) {
      case 'critical':
        return '存储空间即将耗尽，请立即备份并清理数据！';
      case 'high':
        return '存储空间紧张，建议尽快备份数据';
      case 'medium':
        return '存储使用过半，请注意管理数据';
      case 'low':
        return '存储使用正常';
      default:
        return '存储空间充足';
    }
  }, []);

  return { 
    stats, 
    warning, 
    formatSize, 
    formatLimit,
    refresh: calculateStorage,
    getWarningColor,
    getWarningIcon,
    getWarningMessage,
  };
}
