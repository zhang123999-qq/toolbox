/**
 * date-picker E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('date-picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/date-picker')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/日期选择器/)
  })

  test('日历渲染出来，点一天后下方显示 ISO 日期与时间戳', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await expect(page.getByTestId('dp-grid')).toBeVisible()
    await page.getByTestId('dp-day-1').click()
    await expect(page.getByTestId('dp-info')).toContainText('时间戳')
    expect(errors).toEqual([])
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('date-picker')
    await page.getByText('日期选择器').first().click()
    await expect(page).toHaveURL(/\/tools\/date-picker$/)
  })
})
