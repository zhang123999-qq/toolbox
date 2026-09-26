import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('semver-compare', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/semver-compare')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/版本号比较/)
  })

  test('示例 → 输出比较结论', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('结论：1.2.3 小于 1.2.4-beta.1')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('semver')
    await page.getByText('版本号比较').first().click()
    await expect(page).toHaveURL(/\/tools\/semver-compare$/)
  })
})
