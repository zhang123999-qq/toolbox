/**
 * discount E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('discount', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/discount')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/折扣计算/)
  })

  test('示例 → 输出折后单价与实付总额', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('80.00')
    await expect(page.getByTestId('output')).toContainText('160.00')
  })

  test('折扣越界 → 输出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('100')
    await page.getByTestId('input-discountRate').fill('120')
    await expect(page.getByTestId('output').getByRole('alert')).toContainText('折扣须在 0–100 之间')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('折扣计算')
    await page.getByText('折扣计算').first().click()
    await expect(page).toHaveURL(/\/tools\/discount$/)
  })
})
