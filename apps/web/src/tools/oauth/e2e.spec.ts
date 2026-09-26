/**
 * oauth E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('oauth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/oauth')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/OAuth 流程/)
  })

  test('示例输出授权码流程说明', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('response_type=code')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('oauth')
    await page.getByText('OAuth 流程').first().click()
    await expect(page).toHaveURL(/\/tools\/oauth$/)
  })
})
