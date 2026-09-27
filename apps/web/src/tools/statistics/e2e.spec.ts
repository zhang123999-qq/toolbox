/**
 * statistics E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('statistics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/statistics')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/统计图表/)
  })

  test('示例 → 输出图表与汇总', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('chart')).toBeVisible()
    await expect(page.getByTestId('output')).toContainText('数据个数')
  })

  test('非法输入 → 输出区进入错误态', async ({ page }) => {
    await page.getByTestId('input').fill('10\nabc')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('统计图表')
    await page.getByText('统计图表').first().click()
    await expect(page).toHaveURL(/\/tools\/statistics$/)
  })
})
