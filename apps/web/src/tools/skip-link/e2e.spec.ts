/**
 * skip-link E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：纯本地生成与检测；E2E 仅校验页面可达与标题，不点运行。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('跳转链接 (#734)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/skip-link')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/跳转链接/)
  })

  test('默认生成代码可见', async ({ page }) => {
    await expect(page.getByTestId('snippet-html')).toContainText('skip-link')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('跳转链接')
    await page.getByText('跳转链接', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/skip-link$/)
  })
})
