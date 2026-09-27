/**
 * holiday E2E
 * 前置：pnpm build && pnpm preview，再 pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('holiday', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/holiday')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/假期推算/)
  })

  test('示例 → 输出 2025 春节日期', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('2025-01-29')
  })

  test('结果含非权威声明', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('非权威')
  })
})
