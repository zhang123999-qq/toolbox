/**
 * twitter-card E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('twitter-card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/twitter-card')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Twitter Card/)
  })

  test('填入标题后输出 twitter:title 标签', async ({ page }) => {
    await page.getByTestId('input').fill('文章标题')
    await expect(page.getByTestId('output')).toContainText(
      '<meta name="twitter:title" content="文章标题">',
    )
  })

  test('标题为空 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('   ')
    await expect(page.getByTestId('output')).toContainText('twitter:title 不能为空')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('twitter')
    await page.getByText('Twitter Card').first().click()
    await expect(page).toHaveURL(/\/tools\/twitter-card$/)
  })
})
