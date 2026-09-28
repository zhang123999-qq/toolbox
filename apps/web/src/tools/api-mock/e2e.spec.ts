/**
 * api-mock E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：纯前端工具；E2E 仅校验页面可达与默认匹配结果，不发起网络请求。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('API Mock 端点模拟 (#743)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/api-mock')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/API Mock 端点模拟/)
  })

  test('默认请求命中示例路由', async ({ page }) => {
    await expect(page.getByTestId('mock-result')).toContainText('命中路由 #1')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('API Mock 端点模拟')
    await page.getByText('API Mock 端点模拟', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/api-mock$/)
  })
})
