import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('code-convert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/code-convert')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/代码转换/)
  })

  test('示例 → JS 转 Python', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('def greet(name):')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('code-convert')
    await page.getByText('代码转换').first().click()
    await expect(page).toHaveURL(/\/tools\/code-convert$/)
  })
})
