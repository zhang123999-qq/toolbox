/**
 * robots-check E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('robots-check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/robots-check')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/robots 检查/)
  })

  test('全站屏蔽显示警告', async ({ page }) => {
    await page.getByTestId('input').fill('User-agent: *\nDisallow: /')
    await expect(page.getByTestId('output')).toContainText('全站')
  })

  test('规范输入显示无问题结论', async ({ page }) => {
    await page
      .getByTestId('input')
      .fill('User-agent: *\nDisallow: /admin/\nSitemap: https://example.com/s.xml')
    await expect(page.getByTestId('output')).toContainText('符合规范')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('robots-check')
    await page.getByText('robots 检查').first().click()
    await expect(page).toHaveURL(/\/tools\/robots-check$/)
  })
})
