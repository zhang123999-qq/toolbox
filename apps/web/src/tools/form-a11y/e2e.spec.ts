/**
 * form-a11y E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：纯本地检查；E2E 仅校验页面可达与标题，不点运行。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('表单无障碍 (#730)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/form-a11y')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/表单无障碍/)
  })

  test('示例填充表单 HTML', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('input')).toHaveValue(/<form>/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('表单无障碍')
    await page.getByText('表单无障碍', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/form-a11y$/)
  })
})
