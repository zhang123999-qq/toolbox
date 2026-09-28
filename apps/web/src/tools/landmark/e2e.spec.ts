/**
 * landmark E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：纯本地解析；E2E 仅校验页面可达与标题，不点运行。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('地标角色分析 (#733)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/landmark')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/地标角色分析/)
  })

  test('示例填充 HTML', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('input')).toHaveValue(/role="region"/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('地标角色分析')
    await page.getByText('地标角色分析', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/landmark$/)
  })
})
