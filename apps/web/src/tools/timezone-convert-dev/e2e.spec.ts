/**
 * timezone-convert-dev E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('timezone-convert-dev', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/timezone-convert-dev')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/时区转换/)
  })

  test('示例 → 输出目标时区时间', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('America/New_York：')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('时区')
    await page.getByText('时区转换').first().click()
    await expect(page).toHaveURL(/\/tools\/timezone-convert-dev$/)
  })
})
