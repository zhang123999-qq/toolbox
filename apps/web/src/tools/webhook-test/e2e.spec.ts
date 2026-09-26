/**
 * webhook-test E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 注意：用 webhook.site 的公共测试端点，依赖公网可达。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('webhook-test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/webhook-test')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Webhook 测试/)
  })

  test('非法 JSON 载荷时输出错误', async ({ page }) => {
    await page.getByTestId('input').fill('https://hooks.example.com/x')
    await page.getByTestId('input-payload').fill('{bad')
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('webhook')
    await page.getByText('Webhook 测试').first().click()
    await expect(page).toHaveURL(/\/tools\/webhook-test$/)
  })
})
