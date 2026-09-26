/**
 * pgp-tool E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('pgp-tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/pgp-tool`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/PGP 报文检查/)
  })

  test('示例 → 运行后给出结构总览', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('共解析 1 段 PGP Armor')
  })

  test('非 armor 文本时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('not an armor')
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })
})
