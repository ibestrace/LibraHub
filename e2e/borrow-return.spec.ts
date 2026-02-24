import { test, expect } from '@playwright/test';

test.describe('借阅归还', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该显示借阅归还页面', async ({ page }) => {
    await page.click('text=借阅归还');
    await expect(page.locator('text=借书')).toBeVisible();
    await expect(page.locator('text=还书/续借')).toBeVisible();
    await expect(page.locator('text=当前借阅')).toBeVisible();
  });

  test('完整借阅流程', async ({ page }) => {
    // 1. 先添加书籍
    await page.click('text=书籍管理');
    await page.click('button:has-text("添加书籍")');
    await page.fill('input[placeholder="扫描或输入条形码"]', 'BK001');
    await page.fill('input[placeholder="请输入书名"]', '借阅测试书籍');
    await page.fill('input[placeholder="请输入作者"]', '测试作者');
    await page.click('button:has-text("确定")');
    
    // 2. 添加会员
    await page.click('text=会员管理');
    await page.click('button:has-text("添加会员")');
    await page.fill('input[placeholder="扫描或输入会员卡号"]', 'MEM001');
    await page.fill('input[placeholder="请输入姓名"]', '借阅测试会员');
    await page.fill('input[placeholder="请输入电话"]', '13800138001');
    await page.click('button:has-text("确定")');
    
    // 3. 借书
    await page.click('text=借阅归还');
    await page.click('text=借书');
    
    // 输入会员卡号
    await page.fill('input[placeholder="扫描或输入会员卡号"]', 'MEM001');
    await page.press('input[placeholder="扫描或输入会员卡号"]', 'Enter');
    
    // 等待会员信息显示
    await page.waitForTimeout(500);
    
    // 输入书籍条形码
    await page.fill('input[placeholder="扫描或输入书籍条形码"]', 'BK001');
    await page.press('input[placeholder="扫描或输入书籍条形码"]', 'Enter');
    
    // 等待书籍信息显示
    await page.waitForTimeout(500);
    
    // 确认借阅
    await page.click('button:has-text("确认借阅")');
    
    // 验证借阅成功
    await expect(page.locator('text=借书成功')).toBeVisible();
  });
});
