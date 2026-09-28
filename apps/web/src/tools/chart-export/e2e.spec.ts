/**
 * chart-export E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('chart-export 图表导出 (#686)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/chart-export')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/图表导出/)
  })

  test('点示例渲染出预览容器', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('chart-container')).toHaveCount(1)
  })

  test('非法 JSON 显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('{oops')
    await expect(page.getByRole('alert')).toContainText('JSON 解析失败')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('图表导出')
    await page.getByText('图表导出', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/chart-export$/)
  })
})
