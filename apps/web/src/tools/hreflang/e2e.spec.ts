/**
 * hreflang E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('hreflang', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/hreflang')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/hreflang/i)
  })

  test('示例生成 hreflang 标签组', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText(
      '<link rel="alternate" hreflang="zh-CN" href="https://example.com/zh/">',
    )
  })

  test('URL 为空 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('第 1 条：URL 不能为空')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('hreflang')
    await page.getByText('hreflang').first().click()
    await expect(page).toHaveURL(/\/tools\/hreflang$/)
  })
})
