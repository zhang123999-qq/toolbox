/**
 * sitemap-generate E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('sitemap-generate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/sitemap-generate')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Sitemap 生成/)
  })

  test('填入 URL 后输出 urlset', async ({ page }) => {
    await page.getByTestId('input').fill('https://example.com/\nhttps://example.com/about')
    await expect(page.getByTestId('output')).toContainText('<urlset')
    await expect(page.getByTestId('output')).toContainText('<loc>https://example.com/</loc>')
  })

  test('非法 URL → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('not a url')
    await expect(page.getByTestId('output')).toContainText('第 1 行 URL 不合法')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('sitemap')
    await page.getByText('Sitemap 生成').first().click()
    await expect(page).toHaveURL(/\/tools\/sitemap-generate$/)
  })
})
