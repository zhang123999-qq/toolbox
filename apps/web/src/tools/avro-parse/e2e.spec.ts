/**
 * avro-parse E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('avro-parse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/avro-parse`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Avro 解析/)
  })

  test('示例 → 生成字段树与 JSON Schema', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('com.example.User')
    await expect(page.getByTestId('output')).toContainText('JSON Schema')
  })

  test('非法输入时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('{not json')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })
})
