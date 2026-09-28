/**
 * multi-chain E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('multi-chain 多链地址 (#707)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/multi-chain')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/多链地址/)
  })

  test('点示例转换出 TRON 地址', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('value-output')).toContainText('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('多链地址')
    await page.getByText('多链地址', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/multi-chain$/)
  })
})
