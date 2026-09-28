/**
 * pwa-manifest E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('pwa-manifest', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/pwa-manifest')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/PWA Manifest/)
  })

  test('填写必填项后输出 manifest.json', async ({ page }) => {
    await page.getByTestId('input').fill('我的应用')
    await page.getByPlaceholder('应用').fill('应用')
    await expect(page.getByTestId('output')).toContainText('"short_name": "应用"')
  })

  test('name 为空 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('   ')
    await expect(page.getByTestId('output')).toContainText('name（应用名称）不能为空')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('pwa-manifest')
    await page.locator('a[href$="/tools/pwa-manifest"]').first().click()
    await expect(page).toHaveURL(/\/tools\/pwa-manifest$/)
  })
})
