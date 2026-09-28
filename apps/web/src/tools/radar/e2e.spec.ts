/**
 * radar E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('radar 雷达图 (#670)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/radar')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/雷达图/)
  })

  test('点示例渲染出图表容器', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('chart-container')).toHaveCount(1)
  })

  test('非法指标最大值显示错误', async ({ page }) => {
    await page.getByTestId('input-maxText').fill('速度100')
    await expect(page.getByRole('alert')).toContainText('指标最大值')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('雷达图')
    await page.getByText('雷达图', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/radar$/)
  })
})
