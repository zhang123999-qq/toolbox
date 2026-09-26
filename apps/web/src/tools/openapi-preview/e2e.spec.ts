/**
 * openapi-preview E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('openapi-preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/openapi-preview')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/OpenAPI 预览/)
  })

  test('示例输出路径大纲', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('GET /users')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('openapi')
    await page.getByText('OpenAPI 预览').first().click()
    await expect(page).toHaveURL(/\/tools\/openapi-preview$/)
  })
})
