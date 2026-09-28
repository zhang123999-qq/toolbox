/**
 * reading-mode E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：纯本地提取与渲染；E2E 仅校验页面可达与标题，不点运行。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('阅读模式 (#739)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/reading-mode')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/阅读模式/)
  })

  test('空输入时显示提示', async ({ page }) => {
    await expect(page.getByTestId('article-empty')).toContainText('粘贴 HTML')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('阅读模式')
    await page.getByText('阅读模式', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/reading-mode$/)
  })
})
