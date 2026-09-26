/**
 * er-diagram E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('er-diagram', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/er-diagram`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/ER 图/)
  })

  test('示例 → 生成 erDiagram 源码', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('erDiagram')
    await expect(page.getByTestId('output')).toContainText('||--o{')
  })

  test('无建表语句时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('SELECT 1;')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })
})
