/**
 * subtitle-extract E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：示例视频是最小 MP4 头（不含字幕流），真实 ffmpeg 探测后会报
 * “未检测到字幕流”——这正是无内嵌字幕视频的预期结果。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('subtitle-extract', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/subtitle-extract')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/字幕提取/)
  })

  test('载入示例视频（无字幕流）→ 中文提示未检测到字幕流', async ({ page }) => {
    await page.getByTestId('example-video').click()
    await expect(page.getByTestId('error')).toContainText('未检测到字幕流', { timeout: 60000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('subtitle-extract')
    await page.getByText('字幕提取').first().click()
    await expect(page).toHaveURL(/\/tools\/subtitle-extract$/)
  })
})
