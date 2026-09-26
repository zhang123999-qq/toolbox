import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('sql-plan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/sql-plan')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SQL 执行计划/)
  })

  test('示例 → 输出执行计划', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('估算执行计划')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('sql-plan')
    await page.getByText('SQL 执行计划').first().click()
    await expect(page).toHaveURL(/\/tools\/sql-plan$/)
  })
})
