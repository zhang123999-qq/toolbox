/**
 * periodic-table E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，计算在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('元素周期表 (#821)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/periodic-table')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/元素周期表/)
  })

  test('默认展示铁元素信息', async ({ page }) => {
    await expect(page.getByTestId('periodic-table-detail')).toContainText('铁（Fe')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('元素周期表')
    await expect(page.getByRole('link', { name: /元素周期表/ }).first()).toBeVisible()
  })
})
