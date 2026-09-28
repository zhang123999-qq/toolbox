/**
 * breadcrumb E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('breadcrumb', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/breadcrumb')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/面包屑生成/)
  })

  test('输入层级后生成 HTML 与 JSON-LD', async ({ page }) => {
    await page.getByTestId('input').fill('首页 || https://example.com/\n产品')
    await expect(page.getByTestId('output')).toContainText('<nav')
    await expect(page.getByTestId('output')).toContainText('BreadcrumbList')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('breadcrumb')
    await page.getByText('面包屑生成').first().click()
    await expect(page).toHaveURL(/\/tools\/breadcrumb$/)
  })
})
