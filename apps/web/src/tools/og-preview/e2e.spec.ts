/**
 * og-preview E2E（#653）
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 注意：本用例只用粘贴模式，不依赖外部网络与目标站 CORS。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('og-preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/og-preview')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/OG 预览/)
  })

  test('粘贴模式示例 → 运行后输出含 og:title', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('og:title')
  })

  test('示例运行后渲染三张分享卡片', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('card-x')).toBeVisible()
    await expect(page.getByTestId('card-fb')).toBeVisible()
    await expect(page.getByTestId('card-li')).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('og')
    await page.getByText('OG 预览').first().click()
    await expect(page).toHaveURL(/\/tools\/og-preview$/)
  })
})
