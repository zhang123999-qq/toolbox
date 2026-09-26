/**
 * git-diff E2E
 * 前置：pnpm build && pnpm preview，再 pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('git-diff', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/git-diff')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Git Diff/)
  })

  test('示例 → 输出变更文件汇总', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('变更文件：')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('git diff')
    await page.getByText('Git Diff').first().click()
    await expect(page).toHaveURL(/\/tools\/git-diff$/)
  })
})
