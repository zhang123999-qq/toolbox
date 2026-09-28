/**
 * bitmap-font E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，光栅化在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('字体位图 (#796)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/bitmap-font')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/字体位图/)
  })

  test('文本框与生成按钮可见', async ({ page }) => {
    await expect(page.getByTestId('bitmapfont-text')).toBeVisible()
    await expect(page.getByTestId('bitmapfont-run')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('字体位图')
    await page.getByText('字体位图', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/bitmap-font$/)
  })
})
