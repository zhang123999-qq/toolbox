/**
 * jsonl E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('jsonl', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/jsonl`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/JSON/)
  })

  test('示例 → 解析 → 输出 JSON 数组', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('"id": 1')
    await expect(page.getByTestId('output')).toContainText('"id": 2')
  })

  test('坏行时输出区给出带行号的错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('{"a":1}\n{"a":}')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText('第 2 行不是合法 JSON')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('json')
    await page.getByText('JSON Lines').first().click()
    await expect(page).toHaveURL(/\/tools\/jsonl$/)
  })
})
