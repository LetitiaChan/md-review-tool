import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  expect: {
    timeout: 10000,
    // 截图对比配置
    toHaveScreenshot: {
      // 允许 1% 的像素差异，容忍跨平台字体渲染微小差异
      maxDiffPixelRatio: 0.01,
      // 动画稳定后再截图
      animations: 'disabled',
    },
  },
  // 截图基准文件存储路径模板
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    // 固定视口大小，确保截图一致性
    viewport: { width: 1280, height: 720 },
    // 使用 file:// 协议加载本地 HTML
    baseURL: `file:///${path.resolve(__dirname, 'test-container.html').replace(/\\/g, '/')}`,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
