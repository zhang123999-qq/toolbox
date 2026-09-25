/**
 * data-url E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('data-url', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/data-url')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Data URL/)
  })

  test('示例 → 运行 → 输出包含预期内容', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText(
      'data:text/plain;charset=utf-8;base64,5bel5YW35bqT',
    )
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('data-url')
    await page.getByText('Data URL').first().click()
    await expect(page).toHaveURL(/\/tools\/data-url$/)
  })
})
