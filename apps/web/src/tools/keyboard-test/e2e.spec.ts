/**
 * keyboard-test E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达，真实按键事件在 CI 中不可靠。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('键盘测试 (#832)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/keyboard-test')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/键盘测试/)
  })

  test('测试区与清空按钮可见', async ({ page }) => {
    await expect(page.getByTestId('keyboard-zone')).toBeVisible()
    await expect(page.getByTestId('keyboard-clear')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('键盘测试')
    await expect(page.getByRole('link', { name: /键盘测试/ }).first()).toBeVisible()
  })
})
