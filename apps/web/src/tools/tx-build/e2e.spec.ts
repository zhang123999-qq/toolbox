/**
 * tx-build E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('tx-build 交易构建 (#709)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/tx-build')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/交易构建/)
  })

  test('点示例构建出待签名交易', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('value-type')).toContainText('Legacy')
    await expect(page.getByTestId('value-rlp')).toContainText(/^0x[0-9a-f]+$/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('交易构建')
    await page.getByText('交易构建', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/tx-build$/)
  })
})
