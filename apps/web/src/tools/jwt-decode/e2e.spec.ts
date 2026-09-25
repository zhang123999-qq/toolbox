/**
 * jwt-decode E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('jwt-decode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/jwt-decode')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/JWT 解析/)
  })

  test('示例 → 输出包含 header 与 payload', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('"alg": "HS256"')
    await expect(page.getByTestId('output')).toContainText('工具库 Toolbox')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('jwt')
    await page.getByText('JWT 解析').first().click()
    await expect(page).toHaveURL(/\/tools\/jwt-decode$/)
  })
})
