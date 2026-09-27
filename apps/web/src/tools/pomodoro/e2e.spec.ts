/**
 * pomodoro E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('pomodoro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/pomodoro')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/番茄钟/)
  })

  test('默认显示工作阶段 25:00，开始 / 暂停 / 复位按钮可用', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await expect(page.getByTestId('pomo-display')).toHaveText('25:00')
    await page.getByTestId('pomo-start').click()
    await page.getByTestId('pomo-pause').click()
    await page.getByTestId('pomo-reset').click()
    await expect(page.getByTestId('pomo-display')).toHaveText('25:00')
    expect(errors).toEqual([])
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('pomodoro')
    await page.getByText('番茄钟').first().click()
    await expect(page).toHaveURL(/\/tools\/pomodoro$/)
  })
})
