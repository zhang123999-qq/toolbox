/**
 * chinese-zodiac E2E
 * 前置：pnpm build && pnpm preview，再 pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('chinese-zodiac', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/chinese-zodiac')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/生肖干支查询/)
  })

  test('示例 → 输出乙巳蛇年', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('蛇')
    await expect(page.getByTestId('output')).toContainText('乙巳')
  })

  test('搜索可从首页进入', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('chinese-zodiac')
    await page.getByText('生肖干支查询').first().click()
    await expect(page).toHaveURL(/\/tools\/chinese-zodiac$/)
  })
})
