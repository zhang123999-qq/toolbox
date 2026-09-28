/**
 * usb-test E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：C 级工具（WebUSB）；E2E 仅校验页面可达，实际 USB 在 CI 中不可用。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('USB 测试 (#869)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/usb-test')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/USB 测试/)
  })

  test('请求与列表按钮可见', async ({ page }) => {
    await expect(page.getByTestId('usb-connect')).toBeVisible()
    await expect(page.getByTestId('usb-list')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('USB 测试')
    await expect(page.getByRole('link', { name: /USB 测试/ }).first()).toBeVisible()
  })
})
