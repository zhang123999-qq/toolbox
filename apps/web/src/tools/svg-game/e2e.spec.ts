/**
 * svg-game E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，渲染在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('SVG 游戏资源 (#795)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/svg-game')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SVG 游戏资源/)
  })

  test('模板选择与预览可见', async ({ page }) => {
    await expect(page.getByTestId('svggame-template')).toBeVisible()
    await expect(page.getByTestId('svggame-preview')).toBeVisible()
    await expect(page.getByTestId('svggame-download')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('SVG 游戏资源')
    await page.getByText('SVG 游戏资源', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/svg-game$/)
  })
})
