/**
 * openapi-lint E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：纯前端工具；E2E 仅校验页面可达与默认评分，不发起网络请求。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('OpenAPI 规范检查 (#745)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/openapi-lint')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/OpenAPI 规范检查/)
  })

  test('默认示例评 100 分', async ({ page }) => {
    await expect(page.getByTestId('lint-score')).toContainText('100')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('OpenAPI 规范检查')
    await page.getByText('OpenAPI 规范检查', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/openapi-lint$/)
  })
})
