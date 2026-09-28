/**
 * audio-record E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：真实录音需要麦克风权限，E2E 只断言页面结构与初始状态，
 * 不实际录音。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('audio-record', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/audio-record')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/在线录音机/)
  })

  test('初始状态为待机，显示开始录音按钮与计时', async ({ page }) => {
    await expect(page.getByTestId('record-start')).toBeVisible()
    await expect(page.getByTestId('record-status')).toContainText('待机')
    await expect(page.getByTestId('record-elapsed')).toContainText('00:00')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('audio-record')
    await page.getByText('在线录音机').first().click()
    await expect(page).toHaveURL(/\/tools\/audio-record$/)
  })
})
