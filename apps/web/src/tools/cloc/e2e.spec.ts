import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('cloc', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/cloc')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/代码行数统计/)
  })

  test('示例 → 输出代码行数统计', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('代码行数统计')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('cloc')
    await page.getByText('代码行数统计').first().click()
    await expect(page).toHaveURL(/\/tools\/cloc$/)
  })
})
