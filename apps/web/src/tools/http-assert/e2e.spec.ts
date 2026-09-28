/**
 * http-assert E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：D 级工具；E2E 仅校验页面可达与表单元素，不发起真实请求。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('HTTP 断言测试 (#748)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/http-assert')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/HTTP 断言测试/)
  })

  test('断言表单元素存在', async ({ page }) => {
    await expect(page.getByTestId('method')).toBeVisible()
    await expect(page.getByTestId('assertions')).toBeVisible()
    await expect(page.getByTestId('assert-run')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('HTTP 断言测试')
    await page.getByText('HTTP 断言测试', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/http-assert$/)
  })
})
