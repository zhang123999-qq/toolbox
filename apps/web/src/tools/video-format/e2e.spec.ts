/**
 * video-format E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('video-format', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/video-format')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/视频格式识别/)
  })

  test('载入示例视频 → 识别为 MP4 视频', async ({ page }) => {
    await page.getByTestId('example-video').click()
    await expect(page.getByTestId('result-info')).toContainText('识别结果：MP4 视频', {
      timeout: 30000,
    })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('video-format')
    await page.getByText('视频格式识别').first().click()
    await expect(page).toHaveURL(/\/tools\/video-format$/)
  })
})
