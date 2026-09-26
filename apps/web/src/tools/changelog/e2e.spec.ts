import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('changelog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/changelog')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Changelog 生成/)
  })

  test('示例 → 输出 Added / Fixed 分段', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('### Added')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('changelog')
    await page.getByText('Changelog 生成').first().click()
    await expect(page).toHaveURL(/\/tools\/changelog$/)
  })
})
