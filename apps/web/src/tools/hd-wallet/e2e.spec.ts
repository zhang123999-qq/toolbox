/**
 * hd-wallet E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('hd-wallet HD 钱包 (#703)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/hd-wallet')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/HD 钱包/)
  })

  test('示例种子派生首地址', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('address-0')).toContainText('0x022b971dFF0C43305e691DEd7a14367AF19D6407')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('HD 钱包')
    await page.getByText('HD 钱包', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/hd-wallet$/)
  })
})
