/**
 * sprite-preview E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，播放循环在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('精灵图预览 (#799)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/sprite-preview')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/精灵图预览/)
  })

  test('构建按钮与画布可见', async ({ page }) => {
    await expect(page.getByTestId('spritepreview-build')).toBeVisible()
    await expect(page.getByTestId('spritepreview-canvas')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('精灵图预览')
    await page.getByText('精灵图预览', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/sprite-preview$/)
  })
})
