/**
 * http-header-parser E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('http-header-parser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/http-header-parser`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/HTTP/)
  })

  test('示例 → 解析 → 输出含起始行与字段数', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('起始行: GET /api/tools?page=2 HTTP/1.1')
    await expect(page.getByTestId('output')).toContainText('共 5 个字段')
  })

  test('切到 json 格式后输出合法 JSON', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByLabel('格式').selectOption('json')
    await expect(page.getByTestId('output')).toContainText('"kind": "request"')
  })

  test('非法输入时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('不是 HTTP 头')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('http')
    await page.getByText('HTTP Header').first().click()
    await expect(page).toHaveURL(/\/tools\/http-header-parser$/)
  })
})
