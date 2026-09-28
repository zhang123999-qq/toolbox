/**
 * eip712 E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('eip712 结构化数据哈希 (#705)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/eip712')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/EIP-712/)
  })

  test('示例输出官方向量 digest', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('result-0')).toContainText(
      'be609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2',
    )
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('EIP-712')
    await page.getByText('EIP-712 哈希', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/eip712$/)
  })
})
