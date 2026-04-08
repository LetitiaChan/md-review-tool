import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
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
