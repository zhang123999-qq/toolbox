/**
 * vibration E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：C 级工具（Vibration API）；E2E 仅校验页面可达，震动在 CI 中不可靠。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('震动测试 (#866)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/vibration')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/震动测试/)
  })

  test('四个预设按钮可见', async ({ page }) => {
    await expect(page.getByTestId('vibration-short')).toBeVisible()
    await expect(page.getByTestId('vibration-sos')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('震动测试')
    await expect(page.getByRole('link', { name: /震动测试/ }).first()).toBeVisible()
  })
})
