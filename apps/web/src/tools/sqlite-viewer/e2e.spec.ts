/**
 * sqlite-viewer E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('sqlite-viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/sqlite-viewer`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SQLite 查看器/)
  })

  test('存在 .sqlite 文件上传入口', async ({ page }) => {
    const input = page.locator('input[type=file]')
    await expect(input).toHaveAttribute('accept', /sqlite|\.db/)
  })

  test('文本运行时提示改用文件上传', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })
})
