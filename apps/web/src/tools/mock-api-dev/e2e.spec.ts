/**
 * mock-api-dev E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('mock-api-dev', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/mock-api-dev')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Mock API/)
  })

  test('示例输出 mock JSON', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('user1@example.com')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('mock')
    await page.getByText('Mock API').first().click()
    await expect(page).toHaveURL(/\/tools\/mock-api-dev$/)
  })
})
