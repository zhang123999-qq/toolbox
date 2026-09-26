/**
 * curl-to-code E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('curl-to-code', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/curl-to-code')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/cURL 转代码/)
  })

  test('示例输出 fetch 代码', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('fetch(')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('curl')
    await page.getByText('cURL 转代码').first().click()
    await expect(page).toHaveURL(/\/tools\/curl-to-code$/)
  })
})
