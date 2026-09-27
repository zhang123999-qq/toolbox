/**
 * bmi E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('bmi', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/bmi')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/BMI 计算/)
  })

  test('示例 → 输出 BMI：22.9', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('BMI：22.9')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('BMI 计算')
    await page.getByText('BMI 计算').first().click()
    await expect(page).toHaveURL(/\/tools\/bmi$/)
  })
})
