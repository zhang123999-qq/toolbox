/**
 * stopwatch E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('stopwatch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/stopwatch')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/秒表/)
  })

  test('开始 → 计次 → 出现计次列表，页面无未捕获错误', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await expect(page.getByTestId('sw-display')).toContainText(':')
    await page.getByTestId('sw-start').click()
    await page.getByTestId('sw-lap').click()
    await expect(page.getByTestId('sw-laps')).toContainText('第 1 次')
    expect(errors).toEqual([])
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('stopwatch')
    await page.getByText('秒表').first().click()
    await expect(page).toHaveURL(/\/tools\/stopwatch$/)
  })
})
