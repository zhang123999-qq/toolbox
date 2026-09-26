import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('screenshot-dev', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/screenshot-dev')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/网站截图/)
  })

  test('未运行时显示授权提示', async ({ page }) => {
    await expect(page.getByTestId('output')).toContainText('点「运行」')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('screenshot')
    await page.getByText('网站截图').first().click()
    await expect(page).toHaveURL(/\/tools\/screenshot-dev$/)
  })
})
