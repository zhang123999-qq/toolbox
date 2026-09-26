/**
 * data-url-parser E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('data-url-parser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/data-url-parser`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Data URL/)
  })

  test('示例 → 解析 → 输出媒体类型与字节数', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('媒体类型: text/plain;charset=utf-8')
    await expect(page.getByTestId('output')).toContainText('字节数: 10 字节')
  })

  test('切到 raw 后只输出还原出的正文', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByLabel('格式').selectOption('raw')
    await expect(page.getByTestId('output')).toContainText('工具库')
  })

  test('非 Data URL 输入给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('not-a-data-url')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('data url')
    await page.getByText('Data URL 解析').first().click()
    await expect(page).toHaveURL(/\/tools\/data-url-parser$/)
  })
})
