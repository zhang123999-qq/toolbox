/**
 * video-to-audio E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('video-to-audio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/video-to-audio')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/视频转音频/)
  })

  test('比特率非法 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('option-bitrateKbps').fill('9999')
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByTestId('file').click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      name: 'movie.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 1]),
    })
    await expect(page.getByTestId('error')).toContainText('比特率非法', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('video-to-audio')
    await page.getByText('视频转音频').first().click()
    await expect(page).toHaveURL(/\/tools\/video-to-audio$/)
  })
})
