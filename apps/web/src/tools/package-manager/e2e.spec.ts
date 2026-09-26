import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('package-manager', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/package-manager')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/包管理命令/)
  })

  test('示例 → 输出 pnpm 速查表', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('pnpm install')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('package-manager')
    await page.getByText('包管理命令').first().click()
    await expect(page).toHaveURL(/\/tools\/package-manager$/)
  })
})
