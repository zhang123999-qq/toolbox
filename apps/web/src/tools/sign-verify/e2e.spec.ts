/**
 * sign-verify E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('sign-verify 签名验签 (#704)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/sign-verify')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/签名验签/)
  })

  test('示例签名输出确定性签名', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('result-0')).toContainText(
      'e5ddc160e4c8f92de507c7db9b982d4f9b7197bfa421864aeadc586bc96b09ae',
    )
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('签名验签')
    await page.getByText('签名验签', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/sign-verify$/)
  })
})
