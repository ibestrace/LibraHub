import { defineConfig } from '@playwright/test';

export default defineConfig({
  // 测试文件目录
  testDir: './e2e',
  
  // 超时时间
  timeout: 30000,
  
  // 每个测试的超时时间
  expect: {
    timeout: 5000
  },
  
  // 失败重试次数
  retries: 1,
  
  // 并行执行
  workers: '50%',
  
  // 报告配置
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  // 共享配置
  use: {
    // 基础 URL
    baseURL: 'http://localhost:5173',
    
    // 浏览器截图
    screenshot: 'only-on-failure',
    
    // 录制视频
    video: 'retain-on-failure',
    
    // 追踪
    trace: 'retain-on-failure',
    
    // 浏览器上下文
    viewport: { width: 1280, height: 720 },
    
    // 操作超时
    actionTimeout: 5000,
  },
  
  // 启动 Web 服务器
  webServer: {
    command: 'npm run dev',
    port: 5173,
    timeout: 120000,
    reuseExistingServer: true,
  },
  
  // 项目配置
  projects: [
    {
      name: 'chromium',
      use: { 
        browserName: 'chromium',
        // 模拟桌面设备
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'firefox',
      use: { 
        browserName: 'firefox',
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'webkit',
      use: { 
        browserName: 'webkit',
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'Mobile Chrome',
      use: { 
        browserName: 'chromium',
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36'
      },
    },
  ],
  
  // 输出目录
  outputDir: 'test-results',
});
