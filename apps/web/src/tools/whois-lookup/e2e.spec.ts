/**
 * whois-lookup E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('whois-lookup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/whois-lookup')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Whois 查询/)
  })

  test('示例 → 运行后输出注册域名', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('注册域名', { timeout: 15000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('whois')
    await page.getByText('Whois 查询').first().click()
    await expect(page).toHaveURL(/\/tools\/whois-lookup$/)
  })
})
