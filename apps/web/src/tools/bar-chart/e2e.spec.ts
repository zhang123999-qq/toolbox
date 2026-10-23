/**
 * bar-chart E2E
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('bar-chart 条形图 (#666)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/bar-chart')
  })

  test('页面标题包含条形图', async ({ page }) => {
    await expect(page).toHaveTitle(/条形图/)
  })

  test('示例按钮可点击并渲染输出', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toBeVisible()
  })
})
