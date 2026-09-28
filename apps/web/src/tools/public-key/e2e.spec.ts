/**
 * public-key E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('public-key 公钥生成 (#693)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/public-key')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/公钥生成/)
  })

  test('点示例推导出公钥与地址', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('result-0')).toContainText(
      '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    )
    await expect(page.getByTestId('result-2')).toContainText(
      '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
    )
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('公钥生成')
    await page.getByText('公钥生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/public-key$/)
  })
})
