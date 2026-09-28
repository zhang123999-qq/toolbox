/**
 * fortune E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，求签在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('抽签 (#841)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/fortune')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/抽签/)
  })

  test('求签按钮与吉凶筛选存在', async ({ page }) => {
    await expect(page.getByTestId('fortune-draw')).toBeVisible()
    await expect(page.getByTestId('fortune-filter-上上')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('抽签')
    await expect(page.getByRole('link', { name: /抽签/ }).first()).toBeVisible()
  })
})
