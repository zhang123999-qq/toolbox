/**
 * sql-to-orm E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('sql-to-orm', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/sql-to-orm`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SQL 转 ORM/)
  })

  test('示例 → 生成 Sequelize 模型', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText("sequelize.define('users'")
  })

  test('无法解析时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('SELECT 1;')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })
})
