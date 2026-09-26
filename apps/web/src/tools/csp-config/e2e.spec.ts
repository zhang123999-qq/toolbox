/**
 * csp-config E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('csp-config', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/csp-config')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/CSP 指令配置/)
  })

  test('示例输出完整 CSP 头', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText("default-src 'self'")
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('csp config')
    await page.getByText('CSP 指令配置').first().click()
    await expect(page).toHaveURL(/\/tools\/csp-config$/)
  })
})
