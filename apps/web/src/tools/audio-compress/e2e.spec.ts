/**
 * audio-compress E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('audio-compress', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/audio-compress')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/音频压缩/)
  })

  test('载入示例音频 → 播放器出现并显示报告', async ({ page }) => {
    await page.getByTestId('example-audio').click()
    await expect(page.getByTestId('player')).toBeAttached({ timeout: 60000 })
    await expect(page.getByTestId('result-info')).toContainText('压缩比', { timeout: 60000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('audio-compress')
    await page.getByText('音频压缩').first().click()
    await expect(page).toHaveURL(/\/tools\/audio-compress$/)
  })
})
