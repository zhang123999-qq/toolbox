/**
 * wave-gen E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('wave-gen 波浪生成 (#394)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/wave-gen')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/波浪生成/)
  })

  test('默认渲染出 SVG 波浪', async ({ page }) => {
    await expect(page.getByTestId('output').locator('svg')).toHaveCount(1)
  })

  test('振幅越界显示错误', async ({ page }) => {
    await page.getByTestId('option-amplitude').fill('999')
    await expect(page.getByRole('alert')).toContainText('振幅须在 10–150')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('波浪生成')
    await page.getByText('波浪生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/wave-gen$/)
  })
})
