/**
 * title-check E2E（只写不跑）
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 注意：本工具为纯前端本地计算，不依赖公网。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('title-check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/title-check')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/页面标题检查/)
  })

  test('示例 → 运行后给出显示宽度', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('显示宽度', { timeout: 15000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('title')
    await page.getByText('页面标题检查').first().click()
    await expect(page).toHaveURL(/\/tools\/title-check$/)
  })
})
