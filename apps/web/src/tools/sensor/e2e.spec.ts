/**
 * sensor E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：C 级工具（DeviceMotion/DeviceOrientation）；E2E 仅校验页面可达，传感器在 CI 中不可靠。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('传感器 (#867)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/sensor')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/传感器/)
  })

  test('开始监听按钮可见', async ({ page }) => {
    await expect(page.getByTestId('sensor-start')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('传感器')
    await expect(page.getByRole('link', { name: /传感器/ }).first()).toBeVisible()
  })
})
