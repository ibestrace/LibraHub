import { useState, useEffect } from 'react';

/**
 * 防抖 Hook
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流 Hook
 * @param value 需要节流的值
 * @param interval 间隔时间（毫秒）
 * @returns 节流后的值
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdated >= interval) {
      setThrottledValue(value);
      setLastUpdated(now);
    } else {
      const timeout = setTimeout(() => {
        setThrottledValue(value);
        setLastUpdated(Date.now());
      }, interval - (now - lastUpdated));

      return () => clearTimeout(timeout);
    }
  }, [value, interval, lastUpdated]);

  return throttledValue;
}
