/**
 * interest E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('interest', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/interest')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/利息计算/)
  })

  test('示例 → 输出复利利息与本息和', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('1,576.25')
    await expect(page.getByTestId('output')).toContainText('11,576.25')
  })

  test('非法年利率 → 输出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('10000')
    await page.getByTestId('input-annualRate').fill('x')
    await expect(page.getByTestId('output').getByRole('alert')).toContainText('年利率无效')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('利息计算')
    await page.getByText('利息计算').first().click()
    await expect(page).toHaveURL(/\/tools\/interest$/)
  })
})
