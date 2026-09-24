/**
 * query-string E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('query-string', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/query-string`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Query/)
  })

  test('示例 → 解析 → 输出包含解码后的中文', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('工具库')
  })

  test('生成模式下把 JSON 转成查询串', async ({ page }) => {
    await page.getByLabel('模式').selectOption('build')
    await page.getByTestId('input').fill('{"a":1,"b":2}')
    await expect(page.getByTestId('output')).toHaveText('a=1&b=2')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('query')
    await page.getByText('Query String 解析').first().click()
    await expect(page).toHaveURL(/\/tools\/query-string$/)
  })
})
