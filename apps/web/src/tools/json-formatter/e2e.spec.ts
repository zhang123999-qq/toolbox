/**
 * json-formatter E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 浏览器二进制需先安装一次：pnpm exec playwright install chromium
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('json-formatter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/json-formatter`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/JSON/)
  })

  test('示例 → 格式化 → 输出包含格式化后的键', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('"tools": 870')
  })

  test('非法输入时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('{not json')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('清空按钮复位输入', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('clear').click()
    await expect(page.getByTestId('input')).toHaveValue('')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('json')
    await page.getByText('JSON 格式化').first().click()
    await expect(page).toHaveURL(/\/tools\/json-formatter$/)
  })
})
