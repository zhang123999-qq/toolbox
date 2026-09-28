/**
 * funnel E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('funnel 漏斗图 (#676)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/funnel')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/漏斗图/)
  })

  test('点示例渲染出图表容器', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('chart-container')).toHaveCount(1)
  })

  test('非法数据行显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('访问100\n注册:50')
    await expect(page.getByRole('alert')).toContainText('数据行格式非法')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('漏斗图')
    await page.getByText('漏斗图', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/funnel$/)
  })
})
