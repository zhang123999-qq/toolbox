/**
 * speed-test-net E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：D 级工具；E2E 仅校验页面可达与表单元素，真实测速依赖浏览器网络。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('网速测试 (#837)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/speed-test-net')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/网速测试/)
  })

  test('运行按钮与模式选项存在', async ({ page }) => {
    await expect(page.getByTestId('run')).toBeVisible()
    await expect(page.getByTestId('option-mode')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('网速测试')
    await expect(page.getByRole('link', { name: /网速测试/ }).first()).toBeVisible()
  })
})
