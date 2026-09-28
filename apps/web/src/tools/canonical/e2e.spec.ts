/**
 * canonical E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('canonical', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/canonical')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Canonical/)
  })

  test('填入双 URL 后输出 canonical 标签', async ({ page }) => {
    await page.getByTestId('input').fill('https://example.com/a?utm=1')
    await page.getByPlaceholder('https://example.com/blog/post').fill('https://example.com/a')
    await expect(page.getByTestId('output')).toContainText(
      '<link rel="canonical" href="https://example.com/a">',
    )
  })

  test('页面 URL 为空 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('   ')
    await expect(page.getByTestId('output')).toContainText('页面 URL 不能为空')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('canonical')
    await page.getByText('Canonical').first().click()
    await expect(page).toHaveURL(/\/tools\/canonical$/)
  })
})
