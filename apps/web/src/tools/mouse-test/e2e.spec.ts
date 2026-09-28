/**
 * mouse-test E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达，鼠标事件在 CI 中不可靠。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('鼠标测试 (#833)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/mouse-test')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/鼠标测试/)
  })

  test('测试区与清空按钮可见', async ({ page }) => {
    await expect(page.getByTestId('mouse-zone')).toBeVisible()
    await expect(page.getByTestId('mouse-clear')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('鼠标测试')
    await expect(page.getByRole('link', { name: /鼠标测试/ }).first()).toBeVisible()
  })
})
