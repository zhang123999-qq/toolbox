/**
 * bluetooth-test E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：C 级工具（Web Bluetooth）；E2E 仅校验页面可达，实际蓝牙在 CI 中不可用。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('蓝牙测试 (#868)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/bluetooth-test')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/蓝牙测试/)
  })

  test('连接与列表按钮可见', async ({ page }) => {
    await expect(page.getByTestId('bluetooth-connect')).toBeVisible()
    await expect(page.getByTestId('bluetooth-list')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('蓝牙测试')
    await expect(page.getByRole('link', { name: /蓝牙测试/ }).first()).toBeVisible()
  })
})
