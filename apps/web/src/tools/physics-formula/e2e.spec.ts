/**
 * physics-formula E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，计算在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('物理公式 (#822)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/physics-formula')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/物理公式/)
  })

  test('默认计算出结果', async ({ page }) => {
    await expect(page.getByTestId('physics-formula-detail')).toContainText('计算结果：6')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('物理公式')
    await expect(page.getByRole('link', { name: /物理公式/ }).first()).toBeVisible()
  })
})
