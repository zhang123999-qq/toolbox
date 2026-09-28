/**
 * sse E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：C 级工具；E2E 仅校验页面可达与表单元素，不发起真实连接。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('SSE 测试 (#754)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/sse')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SSE 测试/)
  })

  test('连接表单元素存在', async ({ page }) => {
    await expect(page.getByTestId('sse-connect')).toBeVisible()
    await expect(page.getByTestId('sse-disconnect')).toBeVisible()
    await expect(page.getByTestId('sse-status')).toBeVisible()
    await expect(page.getByTestId('sse-events')).toBeVisible()
    await expect(page.getByTestId('sse-log')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('SSE 测试')
    await page.getByText('SSE 测试', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/sse$/)
  })
})
