/**
 * abi-codec E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('abi-codec ABI 编解码 (#695)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/abi-codec')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/ABI 编解码/)
  })

  test('点示例编码出 calldata', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('result-1')).toContainText('0xa9059cbb')
    await expect(page.getByTestId('result-3')).toContainText('0xa9059cbb')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ABI 编解码')
    await page.getByText('ABI 编解码', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/abi-codec$/)
  })
})
