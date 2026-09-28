/**
 * audio-fade E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('audio-fade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/audio-fade')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/音频淡入淡出/)
  })

  test('载入示例音频 → 淡入淡出后显示报告', async ({ page }) => {
    await page.getByTestId('example-audio').click()
    await expect(page.getByTestId('player')).toBeAttached({ timeout: 30000 })
    await expect(page.getByTestId('result-info')).toContainText('淡入：1.00 秒', { timeout: 30000 })
    await expect(page.getByTestId('result-info')).toContainText('曲线：线性')
  })

  test('淡入+淡出超过音频时长 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('example-audio').click()
    await expect(page.getByTestId('player')).toBeAttached({ timeout: 30000 })
    await page.getByTestId('option-fadeIn').fill('3')
    await page.getByTestId('option-fadeOut').fill('3')
    await page.getByTestId('reprocess').click()
    await expect(page.getByTestId('error')).toContainText('超过音频时长')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('audio-fade')
    await page.getByText('音频淡入淡出').first().click()
    await expect(page).toHaveURL(/\/tools\/audio-fade$/)
  })
})
