/**
 * zodiac E2E
 * 前置：pnpm build && pnpm preview，再 pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('zodiac', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/zodiac')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/星座查询/)
  })

  test('示例 → 输出白羊座', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('白羊座')
  })

  test('搜索可从首页进入', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('zodiac')
    await page.getByText('星座查询').first().click()
    await expect(page).toHaveURL(/\/tools\/zodiac$/)
  })
})
