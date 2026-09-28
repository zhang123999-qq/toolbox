/**
 * favicon E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('favicon Favicon 生成 (#386)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/favicon')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Favicon/)
  })

  test('点示例后输出首字母图标', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('favicon-svg')).toBeVisible()
    await expect(page.getByTestId('favicon-svg')).toContainText('F')
  })

  test('导出 PNG 按钮存在且可点击', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('export-png')).toBeVisible()
    await page.getByTestId('export-png').click()
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('Favicon')
    await page.getByText('Favicon 生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/favicon/)
  })
})
