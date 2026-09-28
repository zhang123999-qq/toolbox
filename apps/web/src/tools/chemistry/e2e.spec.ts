/**
 * chemistry E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，计算在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('化学方程式 (#823)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/chemistry')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/化学方程式/)
  })

  test('默认展示配平结果', async ({ page }) => {
    await expect(page.getByTestId('chemistry-detail')).toContainText('2H2 + O2 = 2H2O')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('化学方程式')
    await expect(page.getByRole('link', { name: /化学方程式/ }).first()).toBeVisible()
  })
})
