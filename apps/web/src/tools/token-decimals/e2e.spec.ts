/**
 * token-decimals E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('token-decimals Token 精度 (#699)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/token-decimals')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Token 精度/)
  })

  test('点示例换算出 wei 结果', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('1000000000000000000')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('Token 精度')
    await page.getByText('Token 精度', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/token-decimals$/)
  })
})
