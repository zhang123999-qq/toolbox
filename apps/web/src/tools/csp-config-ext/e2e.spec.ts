/**
 * csp-config-ext E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，生成在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('CSP 配置 (#777)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/csp-config-ext')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/CSP 配置/)
  })

  test('生成按钮与输出', async ({ page }) => {
    await page.getByTestId('cspconfig-generate').click()
    await expect(page.getByTestId('cspconfig-output')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('CSP 配置')
    await page.getByText('CSP 配置', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/csp-config-ext$/)
  })
})
