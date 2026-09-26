/**
 * http-client E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 注意：依赖公网 httpbin.org 可达且允许 CORS。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('http-client', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/http-client')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/HTTP 请求测试/)
  })

  test('示例 → 运行后给出状态码', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('状态：200', { timeout: 15000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    page.on('dialog', async (d) => d.dismiss())
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('http client')
    await page.getByText('HTTP 请求测试').first().click()
    await expect(page).toHaveURL(/\/tools\/http-client$/)
  })
})
