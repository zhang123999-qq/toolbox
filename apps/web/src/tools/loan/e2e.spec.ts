/**
 * loan E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('loan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/loan')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/贷款计算/)
  })

  test('示例 → 输出等额本息月供与总利息', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('6,544.44')
    await expect(page.getByTestId('output')).toContainText('570,665.72')
  })

  test('非法本金 → 输出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('abc')
    await expect(page.getByTestId('output').getByRole('alert')).toContainText('贷款本金无效')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('贷款计算')
    await page.getByText('贷款计算').first().click()
    await expect(page).toHaveURL(/\/tools\/loan$/)
  })
})
