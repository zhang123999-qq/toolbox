/**
 * json-diff E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('json-diff', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/json-diff`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/JSON/)
  })

  test('示例 → 对比 → 输出含差异行', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('+   "tools": 871')
  })

  test('两份相同 JSON 时提示内容相同', async ({ page }) => {
    await page.getByTestId('input').fill('{"a":1}')
    await page.getByTestId('input-textB').fill('{ "a" : 1 }')
    await expect(page.getByTestId('output')).toHaveText('两份 JSON 内容相同')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('json')
    await page.getByText('JSON Diff').first().click()
    await expect(page).toHaveURL(/\/tools\/json-diff$/)
  })
})
