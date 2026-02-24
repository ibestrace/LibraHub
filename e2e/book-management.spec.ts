import { test, expect } from '@playwright/test';

test.describe('书籍管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该显示书籍管理页面', async ({ page }) => {
    // 点击书籍管理菜单
    await page.click('text=书籍管理');
    
    // 检查页面元素
    await expect(page.locator('text=书籍列表')).toBeVisible();
    await expect(page.locator('text=添加书籍')).toBeVisible();
  });

  test('添加新书', async ({ page }) => {
    // 点击书籍管理菜单
    await page.click('text=书籍管理');
    
    // 点击添加书籍按钮
    await page.click('button:has-text("添加书籍")');
    
    // 填写表单
    await page.fill('input[placeholder="扫描或输入条形码"]', 'TEST001');
    await page.fill('input[placeholder="请输入书名"]', '测试书籍');
    await page.fill('input[placeholder="请输入作者"]', '测试作者');
    
    // 提交
    await page.click('button:has-text("确定")');
    
    // 验证添加成功
    await expect(page.locator('text=书籍添加成功')).toBeVisible();
    
    // 验证书籍出现在列表中
    await expect(page.locator('text=测试书籍')).toBeVisible();
  });

  test('搜索书籍', async ({ page }) => {
    // 先添加一本书
    await page.click('text=书籍管理');
    await page.click('button:has-text("添加书籍")');
    await page.fill('input[placeholder="扫描或输入条形码"]', 'TEST002');
    await page.fill('input[placeholder="请输入书名"]', '搜索测试');
    await page.fill('input[placeholder="请输入作者"]', '测试作者');
    await page.click('button:has-text("确定")');
    
    // 搜索
    await page.fill('input[placeholder="搜索书名、作者、条形码..."]', '搜索测试');
    
    // 验证搜索结果
    await expect(page.locator('text=搜索测试')).toBeVisible();
  });

  test('编辑书籍', async ({ page }) => {
    // 先添加一本书
    await page.click('text=书籍管理');
    await page.click('button:has-text("添加书籍")');
    await page.fill('input[placeholder="扫描或输入条形码"]', 'TEST003');
    await page.fill('input[placeholder="请输入书名"]', '编辑前书名');
    await page.fill('input[placeholder="请输入作者"]', '测试作者');
    await page.click('button:has-text("确定")');
    
    // 点击编辑按钮
    await page.click('button[title="编辑"]');
    
    // 修改书名
    await page.fill('input[placeholder="请输入书名"]', '编辑后书名');
    await page.click('button:has-text("确定")');
    
    // 验证更新成功
    await expect(page.locator('text=书籍更新成功')).toBeVisible();
    await expect(page.locator('text=编辑后书名')).toBeVisible();
  });
});
