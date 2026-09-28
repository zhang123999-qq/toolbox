/**
 * 手速测试 E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与交互元素，游戏逻辑在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('手速测试 (#852)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/cps')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/手速测试/)
  })

  test('时长按钮与点击区存在', async ({ page }) => {
    await expect(page.getByTestId('cps-duration-5')).toBeVisible()
    await expect(page.getByTestId('cps-pad')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('手速测试')
    await expect(page.getByRole('link', { name: /手速测试/ }).first()).toBeVisible()
  })
})
