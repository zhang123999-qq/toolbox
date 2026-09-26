/**
 * sql-minify E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('sql-minify', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/sql-minify`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SQL/)
  })

  test('示例 → 压缩 → 输出为单行且不含注释', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toHaveText(
      'SELECT u.id,u.name,COUNT(*) AS cnt FROM users u LEFT JOIN orders o ON o.user_id = u.id ' +
        "WHERE u.age > 18 AND u.status = 'active' GROUP BY u.id ORDER BY cnt DESC LIMIT 10",
    )
  })

  test('非法输入时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill("select 'abc from t")
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('sql')
    await page.getByText('SQL 压缩').first().click()
    await expect(page).toHaveURL(/\/tools\/sql-minify$/)
  })
})
