/**
 * logo E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('logo Logo 生成 (#385)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/logo')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Logo/)
  })

  test('点示例后输出品牌名 SVG', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('logo-svg')).toBeVisible()
    await expect(page.getByTestId('logo-svg')).toContainText('Acme')
  })

  test('切换风格为渐变后出现渐变', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByLabel('风格').selectOption('gradient')
    await expect(page.getByTestId('logo-svg')).toContainText('linearGradient')
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('Logo')
    await page.getByText('Logo 生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/logo/)
  })
})
