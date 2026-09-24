/**
 * word-count E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('word-count', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/word-count')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/字数统计/)
  })

  test('示例 → 运行 → 输出包含预期内容', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('字符数')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('word')
    await page.getByText('字数统计').first().click()
    await expect(page).toHaveURL(/\/tools\/word-count$/)
  })
})
