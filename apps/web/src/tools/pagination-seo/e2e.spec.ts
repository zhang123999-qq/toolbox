/**
 * pagination-seo E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('pagination-seo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/pagination-seo')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/分页 SEO/)
  })

  test('规范分页页显示无问题结论', async ({ page }) => {
    await page
      .getByTestId('input')
      .fill(
        '<link rel="canonical" href="https://example.com/list?page=2">' +
          '<link rel="prev" href="https://example.com/list?page=1">' +
          '<link rel="next" href="https://example.com/list?page=3">',
      )
    await page.getByTestId('input-pageUrl').fill('https://example.com/list?page=2')
    await expect(page.getByTestId('output')).toContainText('设置正确')
  })

  test('缺少 prev 显示警告', async ({ page }) => {
    await page.getByTestId('input').fill('<p>无分页标签</p>')
    await page.getByTestId('input-pageUrl').fill('https://example.com/list?page=3')
    await expect(page.getByTestId('output')).toContainText('缺少 rel="prev"')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('pagination-seo')
    await page.getByText('分页 SEO').first().click()
    await expect(page).toHaveURL(/\/tools\/pagination-seo$/)
  })
})
