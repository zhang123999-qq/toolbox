import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('connection-parser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/connection-parser')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/连接串解析/)
  })

  test('示例 → 输出解析结果', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('host：db.example.com')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('connection-parser')
    await page.getByText('连接串解析').first().click()
    await expect(page).toHaveURL(/\/tools\/connection-parser$/)
  })
})
