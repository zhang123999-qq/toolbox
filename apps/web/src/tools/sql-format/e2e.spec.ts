/**
 * sql-format E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('sql-format', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/sql-format`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SQL/)
  })

  test('示例 → 格式化 → 输出含换行后的 FROM 子句', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('SELECT u.id, u.name, COUNT(*) AS cnt')
    await expect(page.getByTestId('output')).toContainText('GROUP BY u.id')
  })

  test('非法输入时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('select count( from t')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('sql')
    await page.getByText('SQL 格式化').first().click()
    await expect(page).toHaveURL(/\/tools\/sql-format$/)
  })
})
