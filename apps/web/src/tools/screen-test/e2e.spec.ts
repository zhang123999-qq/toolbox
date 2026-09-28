/**
 * screen-test E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达，全屏 API 在 CI 中不可靠。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('屏幕测试 (#834)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/screen-test')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/屏幕测试/)
  })

  test('测试舞台与切换按钮可见', async ({ page }) => {
    await expect(page.getByTestId('screen-stage')).toBeVisible()
    await expect(page.getByTestId('screen-next')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('屏幕测试')
    await expect(page.getByRole('link', { name: /屏幕测试/ }).first()).toBeVisible()
  })
})
