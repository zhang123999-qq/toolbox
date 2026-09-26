/**
 * dns-query E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 注意：该用例依赖公网 dns.google 可达；离线环境会失败。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('dns-query', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/dns-query')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/DNS 查询/)
  })

  test('示例 → 运行后给出 DNS 状态', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('状态码', { timeout: 15000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('dns')
    await page.getByText('DNS 查询').first().click()
    await expect(page).toHaveURL(/\/tools\/dns-query$/)
  })
})
