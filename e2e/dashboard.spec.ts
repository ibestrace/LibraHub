import { test, expect } from '@playwright/test';

test.describe('LibraHub 数据概览', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该显示数据概览页面', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/LibraHub/);
    
    // 检查统计卡片
    await expect(page.locator('text=总藏书量')).toBeVisible();
    await expect(page.locator('text=注册会员')).toBeVisible();
    await expect(page.locator('text=当前借出')).toBeVisible();
    await expect(page.locator('text=逾期未还')).toBeVisible();
  });

  test('应该显示今日动态', async ({ page }) => {
    await expect(page.locator('text=今日动态')).toBeVisible();
    await expect(page.locator('text=今日借阅')).toBeVisible();
    await expect(page.locator('text=今日归还')).toBeVisible();
    await expect(page.locator('text=本月新会员')).toBeVisible();
  });

  test('应该显示系统信息', async ({ page }) => {
    await expect(page.locator('text=系统信息')).toBeVisible();
    await expect(page.locator('text=当前时间')).toBeVisible();
    await expect(page.locator('text=系统状态')).toBeVisible();
    await expect(page.locator('text=图书馆名称')).toBeVisible();
  });

  test('应该显示存储空间监控', async ({ page }) => {
    await expect(page.locator('text=存储空间')).toBeVisible();
  });
});
