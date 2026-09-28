/**
 * contract-abi E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('contract-abi 合约 ABI (#711)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/contract-abi')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/合约 ABI/)
  })

  test('点示例解析出选择器', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('value-hash').first()).toContainText('0xa9059cbb')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('合约 ABI')
    await page.getByText('合约 ABI', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/contract-abi$/)
  })
})
