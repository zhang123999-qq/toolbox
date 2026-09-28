/**
 * extension-pack E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，打包在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('扩展打包 (#775)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/extension-pack')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/扩展打包/)
  })

  test('打包按钮与输出', async ({ page }) => {
    await page.getByTestId('extensionpack-run').click()
    await expect(page.getByTestId('extensionpack-output')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('扩展打包')
    await page.getByText('扩展打包', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/extension-pack$/)
  })
})
