import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('complexity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/complexity')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/代码复杂度/)
  })

  test('示例 → 输出整体圈复杂度', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('整体圈复杂度')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('complexity')
    await page.getByText('代码复杂度').first().click()
    await expect(page).toHaveURL(/\/tools\/complexity$/)
  })
})
