/**
 * video-transcode E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('video-transcode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/video-transcode')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/视频转码/)
  })

  test('容器 / 分辨率选项存在', async ({ page }) => {
    await expect(page.getByTestId('option-format')).toBeAttached()
    await expect(page.getByTestId('option-resolution')).toBeAttached()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('video-transcode')
    await page.getByText('视频转码').first().click()
    await expect(page).toHaveURL(/\/tools\/video-transcode$/)
  })
})
