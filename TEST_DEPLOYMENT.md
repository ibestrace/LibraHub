# LibraHub 测试部署指南

本指南帮助你配置和运行 LibraHub 项目的测试环境。

## 📋 目录

- [环境准备](#环境准备)
- [单元测试](#单元测试)
- [端到端测试 (E2E)](#端到端测试-e2e)
- [测试覆盖率](#测试覆盖率)
- [CI/CD 配置](#cicd-配置)
- [测试部署脚本](#测试部署脚本)
- [故障排查](#故障排查)

## 🚀 环境准备

### 1. 安装依赖

```bash
npm install
```

### 2. 验证测试环境

```bash
# 验证 Vitest
npm test -- --version

# 验证 Playwright
npx playwright --version

# 如需安装 Playwright 浏览器
npx playwright install
```

### 3. 项目结构

```
app/
├── src/
│   ├── hooks/
│   │   ├── useLibrary.tsx
│   │   └── useLibrary.test.tsx
│   ├── services/
│   │   ├── isbn.ts
│   │   ├── isbn.test.ts
│   │   ├── storage.ts
│   │   └── storage.test.ts
│   └── test/
│       └── setup.ts
├── e2e/
│   ├── book-management.spec.ts
│   ├── borrow-return.spec.ts
│   ├── dashboard.spec.ts
│   └── member-management.spec.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

## 🧪 单元测试

### 运行所有单元测试

```bash
# 交互式模式(推荐开发时使用)
npm test

# 一次性运行所有测试
npm run test:run

# 运行特定测试文件
npm test -- src/services/isbn.test.ts
```

### 监听模式

```bash
npm test
```

测试文件修改后自动重新运行。

### 查看测试结果

```
✓ src/services/isbn.test.ts (5)
  ✓ ISBN 格式验证
  ✓ ISBN-10 转换为 ISBN-13
  ✓ 格式化 ISBN 显示
  ✓ 从 OpenLibrary 获取书籍信息
  ✓ 从豆瓣 API 获取书籍信息

Test Files  1 passed (1)
     Tests  5 passed (5)
  Duration  2.34s
```

### 编写单元测试示例

```typescript
import { describe, it, expect, vi } from 'vitest';
import { IsbnService } from '@/services/isbn';

describe('IsbnService', () => {
  describe('isValidIsbn', () => {
    it('应该验证有效的 ISBN-13', () => {
      expect(IsbnService.isValidIsbn('9787111544937')).toBe(true);
    });

    it('应该验证有效的 ISBN-10', () => {
      expect(IsbnService.isValidIsbn('711154493X')).toBe(true);
    });

    it('应该拒绝无效的 ISBN', () => {
      expect(IsbnService.isValidIsbn('123456789')).toBe(false);
    });
  });

  describe('isbn10To13', () => {
    it('应该正确转换 ISBN-10 到 ISBN-13', () => {
      expect(IsbnService.isbn10To13('711154493X')).toBe('9787111544937');
    });
  });
});
```

## 🎭 端到端测试 (E2E)

### 运行所有 E2E 测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 使用 UI 模式运行(推荐)
npm run test:e2e:ui

# 查看测试报告
npm run test:e2e:report
```

### 运行特定测试文件

```bash
# 运行书籍管理测试
npx playwright test book-management.spec.ts

# 运行特定浏览器
npx playwright test --project=chromium

# 运行移动端测试
npx playwright test --project="Mobile Chrome"
```

### Playwright UI 模式

```bash
npm run test:e2e:ui
```

提供:
- 可视化测试执行
- 逐步骤调试
- 时间旅行调试
- 实时日志查看

### 查看测试报告

```bash
# 运行测试后查看 HTML 报告
npm run test:e2e:report

# 或直接打开报告目录
npx playwright show-report playwright-report
```

### 编写 E2E 测试示例

```typescript
import { test, expect } from '@playwright/test';

test.describe('书籍管理', () => {
  test('应该能够添加新书籍', async ({ page }) => {
    // 访问应用
    await page.goto('/');

    // 导航到书籍管理页面
    await page.click('text=书籍管理');

    // 点击添加按钮
    await page.click('text=添加书籍');

    // 填写表单
    await page.fill('input[placeholder="扫描或输入条形码"]', '1234567890');
    await page.fill('input[placeholder="请输入ISBN号"]', '9787111544937');
    await page.fill('input[placeholder="请输入书名"]', '测试书籍');
    await page.fill('input[placeholder="请输入作者"]', '测试作者');

    // 提交表单
    await page.click('text=确认添加');

    // 验证成功消息
    await expect(page.locator('text=书籍添加成功')).toBeVisible();
  });

  test('应该能够通过扫码录入书籍', async ({ page }) => {
    await page.goto('/');

    // 点击扫码录入按钮
    await page.click('text=扫码录入');

    // 模拟扫码枪输入
    const scanInput = page.locator('input[placeholder="请扫描条形码..."]');
    await scanInput.fill('1234567890');
    await scanInput.press('Enter');

    // 验证添加弹窗打开
    await expect(page.locator('text=添加书籍')).toBeVisible();
  });
});
```

## 📊 测试覆盖率

### 生成覆盖率报告

```bash
# 生成覆盖率报告
npm run test:coverage

# 查看详细报告
open coverage/index.html
```

### 覆盖率报告示例

```
File              | % Stmts | % Branch | % Funcs | % Lines |
------------------|----------|----------|---------|---------|
All files         |   85.42  |   78.91  |   82.35  |   86.21 |
 services         |   92.31  |   88.89  |   90.00  |   93.10 |
  isbn.ts         |   95.45  |   90.00  |  100.00  |   95.65 |
  storage.ts      |   88.24  |   85.71  |   83.33  |   90.00 |
 hooks            |   75.00  |   66.67  |   71.43  |   76.47 |
  useLibrary.tsx  |   75.00  |   66.67  |   71.43  |   76.47 |
```

### 覆盖率目标

- **语句覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 75%
- **函数覆盖率**: ≥ 80%
- **行覆盖率**: ≥ 80%

### 覆盖率配置

在 `vitest.config.ts` 中:

```typescript
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    // 排除文件
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.d.ts',
      '**/*.config.*',
      '**/src/test/**',
    ],
    // 覆盖率阈值
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
}
```

## 🔄 CI/CD 配置

### GitHub Actions 配置

创建 `.github/workflows/test.yml`:

```yaml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  unit-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:run

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests

  e2e-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build project
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### GitLab CI 配置

创建 `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - e2e

unit-test:
  stage: test
  image: node:20
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run test:run
    - npm run test:coverage
  coverage: '/All files.*?\|\s*([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
    expire_in: 1 week

e2e-test:
  stage: e2e
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm run build
    - npx playwright install --with-deps
    - npm run test:e2e
  artifacts:
    when: always
    paths:
      - playwright-report/
      - test-results/
    expire_in: 1 week
```

## 📜 测试部署脚本

### 完整测试脚本

创建 `scripts/test-all.sh`:

```bash
#!/bin/bash

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  LibraHub 完整测试流程${NC}"
echo -e "${YELLOW}========================================${NC}"

# 1. 代码检查
echo -e "\n${YELLOW}1. 运行代码检查...${NC}"
npm run lint
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 代码检查失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 代码检查通过${NC}"

# 2. 类型检查
echo -e "\n${YELLOW}2. 运行类型检查...${NC}"
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 类型检查失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 类型检查通过${NC}"

# 3. 单元测试
echo -e "\n${YELLOW}3. 运行单元测试...${NC}"
npm run test:run
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 单元测试失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 单元测试通过${NC}"

# 4. 生成覆盖率报告
echo -e "\n${YELLOW}4. 生成测试覆盖率报告...${NC}"
npm run test:coverage
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 覆盖率报告生成失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 覆盖率报告已生成${NC}"

# 5. E2E 测试
echo -e "\n${YELLOW}5. 运行 E2E 测试...${NC}"
npm run test:e2e
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ E2E 测试失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ E2E 测试通过${NC}"

# 6. 构建项目
echo -e "\n${YELLOW}6. 构建项目...${NC}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 构建失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 构建成功${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  🎉 所有测试通过!${NC}"
echo -e "${GREEN}========================================${NC}"
```

### Windows 批处理脚本

创建 `scripts/test-all.bat`:

```batch
@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   LibraHub 完整测试流程
echo ========================================

REM 1. 代码检查
echo.
echo 1. 运行代码检查...
call npm run lint
if errorlevel 1 (
    echo ❌ 代码检查失败
    exit /b 1
)
echo ✅ 代码检查通过

REM 2. 单元测试
echo.
echo 2. 运行单元测试...
call npm run test:run
if errorlevel 1 (
    echo ❌ 单元测试失败
    exit /b 1
)
echo ✅ 单元测试通过

REM 3. 生成覆盖率报告
echo.
echo 3. 生成测试覆盖率报告...
call npm run test:coverage
if errorlevel 1 (
    echo ❌ 覆盖率报告生成失败
    exit /b 1
)
echo ✅ 覆盖率报告已生成

REM 4. E2E 测试
echo.
echo 4. 运行 E2E 测试...
call npm run test:e2e
if errorlevel 1 (
    echo ❌ E2E 测试失败
    exit /b 1
)
echo ✅ E2E 测试通过

REM 5. 构建项目
echo.
echo 5. 构建项目...
call npm run build
if errorlevel 1 (
    echo ❌ 构建失败
    exit /b 1
)
echo ✅ 构建成功

echo.
echo ========================================
echo   🎉 所有测试通过!
echo ========================================

pause
```

### 快速测试脚本

创建 `scripts/test-quick.sh`:

```bash
#!/bin/bash

# 快速测试 - 只运行单元测试和构建
echo "运行快速测试..."

# 单元测试
npm run test:run

# 构建
npm run build

echo "快速测试完成!"
```

## 🔍 故障排查

### 问题 1: Vitest 无法启动

**症状**: `npm test` 报错 `vitest not found`

**解决方案**:
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

### 问题 2: Playwright 浏览器未安装

**症状**: E2E 测试失败,提示浏览器未找到

**解决方案**:
```bash
# 安装 Playwright 浏览器
npx playwright install

# 安装所有依赖(包括系统依赖)
npx playwright install --with-deps
```

### 问题 3: 端口被占用

**症状**: 开发服务器启动失败,提示端口 5173 被占用

**解决方案**:
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <进程ID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill -9
```

或修改 `playwright.config.ts` 中的端口:
```typescript
webServer: {
  command: 'npm run dev',
  port: 5174, // 修改端口
  // ...
}
```

### 问题 4: 测试超时

**症状**: 测试运行时间过长或超时

**解决方案**:
```typescript
// vitest.config.ts
test: {
  testTimeout: 10000, // 增加超时时间
  hookTimeout: 10000,
}

// playwright.config.ts
use: {
  actionTimeout: 10000, // 增加操作超时
}
```

### 问题 5: 内存不足

**症状**: 测试运行时内存溢出

**解决方案**:
```bash
# 增加 Node.js 内存限制
node --max-old-space-size=4096 node_modules/vitest/vitest.mjs
```

## 📝 最佳实践

### 1. 测试命名规范

```typescript
// ✅ 好的命名
describe('书籍管理', () => {
  it('应该能够添加新书籍', () => {});

  it('应该能够删除书籍', () => {});

  it('当 ISBN 无效时应该显示错误', () => {});
});

// ❌ 不好的命名
describe('测试', () => {
  it('测试1', () => {});

  it('测试功能', () => {});
});
```

### 2. 测试隔离

每个测试应该独立运行,不依赖其他测试:

```typescript
// ✅ 好的做法 - 每个测试独立
test('测试功能A', async () => {
  // 设置独立的测试环境
  const data = { name: 'test' };
  // ...
});

test('测试功能B', async () => {
  // 不依赖功能A的结果
  const data = { name: 'test' };
  // ...
});

// ❌ 不好的做法 - 依赖其他测试
let data: any;

test('测试功能A', () => {
  data = { name: 'test' };
});

test('测试功能B', () => {
  // 依赖功能A的结果
  expect(data.name).toBe('test');
});
```

### 3. 使用 Mock 和 Spy

```typescript
// Mock 外部 API
vi.mock('@/services/isbn', () => ({
  IsbnService: {
    fetchByIsbn: vi.fn().mockResolvedValue({
      title: 'Mock 书籍',
      author: 'Mock 作者',
    }),
  },
}));

// Spy 函数调用
const spy = vi.spyOn(console, 'log');
// ... 运行测试
expect(spy).toHaveBeenCalledWith('test');
spy.mockRestore();
```

### 4. 异步测试处理

```typescript
// ✅ 好的做法 - 使用 async/await
test('异步操作', async () => {
  const result = await fetchData();
  expect(result).toBe('success');
});

// ✅ 或者使用 Promise
test('异步操作', () => {
  return fetchData().then(result => {
    expect(result).toBe('success');
  });
});
```

## 📚 相关文档

- [Vitest 官方文档](https://vitest.dev/)
- [Playwright 官方文档](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [项目 README](README.md)
- [部署指南](DEPLOYMENT_LOCAL.md)

---

**提示**: 定期运行测试,保持代码质量! 🎯
