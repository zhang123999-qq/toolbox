/**
 * gauge E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('gauge 仪表盘 (#677)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/gauge')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/仪表盘/)
  })

  test('点示例渲染出图表容器', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('chart-container')).toHaveCount(1)
  })

  test('当前值越界显示错误', async ({ page }) => {
    await page.getByTestId('input-value').fill('120')
    await page.getByTestId('input-min').fill('0')
    await page.getByTestId('input-max').fill('100')
    await expect(page.getByRole('alert')).toContainText('当前值须在 0–100 之间')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('仪表盘')
    await page.getByText('仪表盘', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/gauge$/)
  })
})
