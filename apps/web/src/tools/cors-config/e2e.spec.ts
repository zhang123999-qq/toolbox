/**
 * cors-config E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('cors-config', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/cors-config')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/CORS 配置/)
  })

  test('指定来源后示例输出 Allow-Origin 头', async ({ page }) => {
    await page.getByLabel('允许的 Origin').fill('https://example.com')
    await page.getByLabel('来源模式').selectOption('specific')
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText(
      'Access-Control-Allow-Origin: https://example.com',
    )
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('cors')
    await page.getByText('CORS 配置').first().click()
    await expect(page).toHaveURL(/\/tools\/cors-config$/)
  })
})
