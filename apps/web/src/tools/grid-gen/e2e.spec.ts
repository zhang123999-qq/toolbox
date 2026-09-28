/**
 * grid-gen E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('grid-gen 网格生成 (#395)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/grid-gen')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/网格生成/)
  })

  test('默认渲染出 SVG 点阵', async ({ page }) => {
    await expect(page.getByTestId('output').locator('svg circle')).toHaveCount(1)
  })

  test('间距越界显示错误', async ({ page }) => {
    await page.getByTestId('option-spacing').fill('1')
    await expect(page.getByRole('alert')).toContainText('间距须在 5–100')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('网格生成')
    await page.getByText('网格生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/grid-gen$/)
  })
})
