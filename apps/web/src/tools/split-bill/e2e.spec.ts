/**
 * split-bill E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('split-bill', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/split-bill')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/AA 分账/)
  })

  test('示例 → 输出 300 元 3 人 AA', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('人均（3 人）：100.00 元')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('AA 分账')
    await page.getByText('AA 分账').first().click()
    await expect(page).toHaveURL(/\/tools\/split-bill$/)
  })
})
