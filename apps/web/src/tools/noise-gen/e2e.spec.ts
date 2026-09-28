/**
 * noise-gen E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('noise-gen 噪声生成 (#396)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/noise-gen')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/噪声生成/)
  })

  test('默认渲染出 canvas', async ({ page }) => {
    await expect(page.getByTestId('noise-canvas')).toHaveCount(1)
  })

  test('尺度越界显示错误', async ({ page }) => {
    await page.getByTestId('option-scale').fill('99')
    await expect(page.getByRole('alert')).toContainText('尺度须在 0.005–0.1')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('噪声生成')
    await page.getByText('噪声生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/noise-gen$/)
  })
})
