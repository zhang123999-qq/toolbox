/**
 * icu-message E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：纯本地解析；E2E 仅校验页面可达与标题，不点运行。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ICU 消息预览 (#728)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/icu-message')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/ICU 消息预览/)
  })

  test('示例填充消息与变量', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('input')).toHaveValue(/plural/)
    await expect(page.getByTestId('input-values')).toHaveValue(/"n": 5/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ICU 消息预览')
    await page.getByText('ICU 消息预览', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/icu-message$/)
  })
})
