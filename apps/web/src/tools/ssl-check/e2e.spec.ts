/**
 * ssl-check E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ssl-check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/ssl-check`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SSL 证书体检/)
  })

  test('示例 → 运行后给出体检结论', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('总体结论')
  })

  test('非法 PEM 时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('not a pem')
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })
})
