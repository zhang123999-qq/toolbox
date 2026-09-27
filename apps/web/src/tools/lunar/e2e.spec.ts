/**
 * lunar E2E
 * 前置：pnpm build && pnpm preview，再 pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('lunar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/lunar')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/公历农历互转/)
  })

  test('示例 → 输出正月初一', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('正月初一')
  })

  test('切方向输入闰二月初一 → 2023-03-22', async ({ page }) => {
    await page.getByLabel('方向').selectOption('lunar2solar')
    await page.getByTestId('input').fill('2023-闰2-1')
    await expect(page.getByTestId('output')).toContainText('2023-03-22')
  })
})
