/**
 * vim-cheatsheet E2E
 * 前置：pnpm build && pnpm preview，再 pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('vim-cheatsheet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/vim-cheatsheet')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Vim 命令/)
  })

  test('示例 → 输出常用按键', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('Esc')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('vim')
    await page.getByText('Vim 命令').first().click()
    await expect(page).toHaveURL(/\/tools\/vim-cheatsheet$/)
  })
})
