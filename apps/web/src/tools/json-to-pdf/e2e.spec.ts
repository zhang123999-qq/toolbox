/**
 * json-to-pdf E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：本机未安装 Playwright 浏览器时只写文件不运行。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('json-to-pdf', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/json-to-pdf')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/JSON 转 PDF/)
  })

  test('示例 → 生成 PDF → 显示页数信息', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('export-pdf').click()
    await expect(page.getByTestId('pdf-info')).toContainText(/页/, { timeout: 30000 })
  })

  test('非法 JSON 给出明确中文错误', async ({ page }) => {
    await page.getByTestId('input').fill('{bad json}')
    await page.getByTestId('export-pdf').click()
    await expect(page.getByTestId('export-error')).toContainText('JSON 解析失败')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('json-to-pdf')
    await page.getByText('JSON 转 PDF').first().click()
    await expect(page).toHaveURL(/\/tools\/json-to-pdf$/)
  })
})
