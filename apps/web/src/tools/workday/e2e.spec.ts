/**
 * workday E2E
 * 前置：pnpm build && pnpm preview，再 pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('workday', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/workday')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/工作日计算/)
  })

  test('示例 → 结果日期 2025-01-30', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('结果日期：2025-01-30')
  })

  test('搜索可从首页进入', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('workday')
    await page.getByText('工作日计算').first().click()
    await expect(page).toHaveURL(/\/tools\/workday$/)
  })
})
