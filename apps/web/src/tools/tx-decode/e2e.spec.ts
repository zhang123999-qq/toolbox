/**
 * tx-decode E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('tx-decode 交易解码 (#696)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/tx-decode')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/交易解码/)
  })

  test('点示例解码出交易字段', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('value-type')).toContainText('Legacy')
    await expect(page.getByTestId('value-nonce')).toContainText('7')
    await expect(page.getByTestId('value-hash')).toContainText('0x393204fda69e377f7d7c60468a2475068d940146115e77ff445230da311435cf')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('交易解码')
    await page.getByText('交易解码', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/tx-decode$/)
  })
})
