/**
 * sitemap-check E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('sitemap-check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/sitemap-check')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/网站地图检查/)
  })

  test('粘贴规范 XML 后显示通过结论', async ({ page }) => {
    await page
      .getByTestId('input')
      .fill('<?xml version="1.0"?><urlset><url><loc>https://example.com/</loc></url></urlset>')
    await expect(page.getByTestId('output')).toContainText('符合规范')
  })

  test('重复 loc 显示错误', async ({ page }) => {
    await page
      .getByTestId('input')
      .fill(
        '<urlset><url><loc>https://example.com/</loc></url><url><loc>https://example.com/</loc></url></urlset>',
      )
    await expect(page.getByTestId('output')).toContainText('重复')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('sitemap-check')
    await page.getByText('网站地图检查').first().click()
    await expect(page).toHaveURL(/\/tools\/sitemap-check$/)
  })
})
