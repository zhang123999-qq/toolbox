import { defineConfig, devices } from '@playwright/test'

/**
 * E2E 配置（DEVELOPMENT.md §8.2）
 * 默认自动拉起 vite preview；若已手动启动，设置 E2E_NO_WEBSERVER=1 复用。
 */
const PORT = 4173
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: 'src',
  // 只认工具目录下的 e2e.spec.ts
  testMatch: '**/e2e.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_NO_WEBSERVER
    ? undefined
    : {
        command: 'pnpm preview --port 4173 --host 127.0.0.1',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
