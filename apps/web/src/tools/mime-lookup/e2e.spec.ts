/**
 * mime-lookup E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('mime-lookup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/mime-lookup`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/MIME/)
  })

  test('示例 → 扩展名查 MIME', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('png → image/png')
    await expect(page.getByTestId('output')).toContainText('svg → image/svg+xml')
  })

  test('切到 MIME 反查模式后能反查扩展名', async ({ page }) => {
    await page.getByTestId('input').fill('application/pdf')
    await page.getByRole('combobox', { name: '模式' }).selectOption('mime2ext')
    await expect(page.getByTestId('output')).toContainText('.pdf')
  })

  test('严格模式下未命中给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('not-a-real-ext')
    await page.getByLabel('严格模式').check()
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('mime')
    await page.getByText('MIME 查询').first().click()
    await expect(page).toHaveURL(/\/tools\/mime-lookup$/)
  })
})
