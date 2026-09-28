/**
 * cloudflare E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，计算在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('Cloudflare 配置 (#813)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/cloudflare')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Cloudflare 配置/)
  })

  test('默认生成 DNS 记录', async ({ page }) => {
    await expect(page.getByTestId('cloudflare-result')).toContainText('"type": "A"')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('Cloudflare 配置')
    await expect(page.getByRole('link', { name: /Cloudflare 配置/ }).first()).toBeVisible()
  })
})
