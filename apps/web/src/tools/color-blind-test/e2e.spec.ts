/**
 * 色盲测试 E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与交互元素，游戏逻辑在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('色盲测试 (#854)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/color-blind-test')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/色盲测试/)
  })

  test('画布与输入框存在', async ({ page }) => {
    await expect(page.getByTestId('cbt-canvas')).toBeVisible()
    await expect(page.getByTestId('cbt-input')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('色盲测试')
    await expect(page.getByRole('link', { name: /色盲测试/ }).first()).toBeVisible()
  })
})
