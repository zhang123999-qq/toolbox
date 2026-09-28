/**
 * network-info E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：C 级工具（Network Information API）；E2E 仅校验页面可达，API 在 CI 中不可靠。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('网络信息 (#862)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/network-info')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/网络信息/)
  })

  test('检测按钮可见', async ({ page }) => {
    await expect(page.getByTestId('network-refresh')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('网络信息')
    await expect(page.getByRole('link', { name: /网络信息/ }).first()).toBeVisible()
  })
})
