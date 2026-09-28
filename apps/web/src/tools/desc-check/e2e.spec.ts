/**
 * desc-check E2E（只写不跑）
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 纯本地工具，无网络依赖。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('desc-check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/desc-check')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/页面描述检查/)
  })

  test('示例 → 运行后显示评分', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('/ 100')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('页面描述')
    await page.getByText('页面描述检查').first().click()
    await expect(page).toHaveURL(/\/tools\/desc-check$/)
  })
})
