/**
 * mock-data E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('mock-data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/mock-data`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Mock/)
  })

  test('示例 → 生成 5 条含中文姓名的 JSON', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('"createdAt"')
    await expect(page.getByTestId('output')).toContainText('"phone": "1')
  })

  test('切换数量后数据条数变化', async ({ page }) => {
    await page.getByTestId('input').fill('{"name":"@cname"}')
    await page.getByLabel('数量').selectOption('1')
    await expect(page.getByTestId('output')).toContainText('"name"')
  })

  test('未知占位符时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('{"a":"@nope"}')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('mock')
    await page.getByText('Mock 数据').first().click()
    await expect(page).toHaveURL(/\/tools\/mock-data$/)
  })
})
