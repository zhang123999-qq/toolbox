/**
 * meta E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('meta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/meta')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Meta 标签/)
  })

  test('填入标题后输出 title 标签', async ({ page }) => {
    await page.getByTestId('input').fill('我的博客')
    await expect(page.getByTestId('output')).toContainText('<title>我的博客</title>')
  })

  test('标题为空 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('   ')
    await expect(page.getByTestId('output')).toContainText('页面标题（title）不能为空')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('meta')
    await page.getByText('Meta 标签').first().click()
    await expect(page).toHaveURL(/\/tools\/meta$/)
  })
})
