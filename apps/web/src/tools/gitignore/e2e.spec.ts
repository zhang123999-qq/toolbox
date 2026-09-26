/**
 * gitignore E2E
 * 前置：pnpm build && pnpm preview，再 pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('gitignore', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/gitignore')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/gitignore 生成/)
  })

  test('示例 → 输出包含 node_modules', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('node_modules/')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('gitignore')
    await page.getByText('gitignore 生成').first().click()
    await expect(page).toHaveURL(/\/tools\/gitignore$/)
  })
})
