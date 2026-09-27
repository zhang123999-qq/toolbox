/**
 * bmr E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('bmr', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/bmr')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/BMR 计算/)
  })

  test('示例 → 输出 BMR：1648.8', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('BMR：1648.8 kcal/天')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('BMR 计算')
    await page.getByText('BMR 计算').first().click()
    await expect(page).toHaveURL(/\/tools\/bmr$/)
  })
})
