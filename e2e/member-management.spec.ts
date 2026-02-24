import { test, expect } from '@playwright/test';

test.describe('会员管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该显示会员管理页面', async ({ page }) => {
    await page.click('text=会员管理');
    await expect(page.locator('text=会员列表')).toBeVisible();
    await expect(page.locator('text=添加会员')).toBeVisible();
  });

  test('添加新会员', async ({ page }) => {
    await page.click('text=会员管理');
    await page.click('button:has-text("添加会员")');
    
    // 填写表单
    await page.fill('input[placeholder="扫描或输入会员卡号"]', 'M001');
    await page.fill('input[placeholder="请输入姓名"]', '测试会员');
    await page.fill('input[placeholder="请输入电话"]', '13800138001');
    
    await page.click('button:has-text("确定")');
    
    await expect(page.locator('text=会员添加成功')).toBeVisible();
    await expect(page.locator('text=测试会员')).toBeVisible();
  });

  test('搜索会员', async ({ page }) => {
    // 先添加会员
    await page.click('text=会员管理');
    await page.click('button:has-text("添加会员")');
    await page.fill('input[placeholder="扫描或输入会员卡号"]', 'M002');
    await page.fill('input[placeholder="请输入姓名"]', '搜索测试');
    await page.fill('input[placeholder="请输入电话"]', '13800138002');
    await page.click('button:has-text("确定")');
    
    // 搜索
    await page.fill('input[placeholder="搜索姓名、卡号、电话..."]', '搜索测试');
    
    // 验证搜索结果
    await expect(page.locator('text=搜索测试')).toBeVisible();
  });
});
