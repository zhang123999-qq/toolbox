/**
 * favicon-check E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 注意：本工具的真实检查会向目标站点发跨域 HEAD 请求，e2e 不做 mock、
 * 也不点「开始检查」（避免依赖公网可达），只覆盖页面可达性的稳定用例。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('favicon-check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/favicon-check')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Favicon 检查/)
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('favicon')
    await page.getByText('Favicon 检查').first().click()
    await expect(page).toHaveURL(/\/tools\/favicon-check$/)
  })
})
