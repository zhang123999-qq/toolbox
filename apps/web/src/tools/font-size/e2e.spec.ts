/**
 * font-size E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：纯本地生成与评估；E2E 仅校验页面可达与标题，不点运行。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('字体大小 (#738)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/font-size')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/字体大小/)
  })

  test('默认生成 clamp CSS 可见', async ({ page }) => {
    await expect(page.getByTestId('fluid-output')).toContainText('clamp(')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('字体大小')
    await page.getByText('字体大小', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/font-size$/)
  })
})
