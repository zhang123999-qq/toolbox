/**
 * timer E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('timer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/timer')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/计时器/)
  })

  test('示例 → 出现倒计时与开始按钮，点击开始后状态为计时中', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('timer-display')).toContainText(':')
    await expect(page.getByTestId('timer-start')).toBeVisible()
    await page.getByTestId('timer-start').click()
    await expect(page.getByTestId('timer-status')).toContainText('计时中')
  })

  test('从首页能通过搜索进入该工具，且页面无未捕获错误', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('timer')
    await page.getByText('计时器').first().click()
    await expect(page).toHaveURL(/\/tools\/timer$/)
    expect(errors).toEqual([])
  })
})
