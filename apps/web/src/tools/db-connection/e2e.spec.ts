import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('db-connection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/db-connection')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/数据库连接串/)
  })

  test('示例 → 输出 mysql 连接串', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('mysql://')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('db-connection')
    await page.getByText('数据库连接串').first().click()
    await expect(page).toHaveURL(/\/tools\/db-connection$/)
  })
})
