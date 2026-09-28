/**
 * api-sign E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：C 级工具；E2E 仅校验页面可达与表单元素，签名在本地计算。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('接口签名 (#757)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/api-sign')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/接口签名/)
  })

  test('签名单元素存在', async ({ page }) => {
    await expect(page.getByTestId('apisign-method')).toBeVisible()
    await expect(page.getByTestId('apisign-path')).toBeVisible()
    await expect(page.getByTestId('apisign-secret')).toBeVisible()
    await expect(page.getByTestId('apisign-sign')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('接口签名')
    await page.getByText('接口签名', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/api-sign$/)
  })
})
