/**
 * video-thumbnail E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：截取需要真实可解码的视频文件，E2E 只覆盖参数校验与导航，
 * 截取流程由组件测试（事件驱动）覆盖。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('video-thumbnail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/video-thumbnail')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/视频缩略图/)
  })

  test('时间点格式非法 → 选文件时直接中文错误提示', async ({ page }) => {
    await page.getByTestId('option-timestamps').fill('abc')
    await page.getByTestId('file').setInputFiles({
      name: 'movie.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 1]),
    })
    await expect(page.getByTestId('error')).toContainText('时间点非法')
  })

  test('时间点为空 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('option-timestamps').fill('')
    await page.getByTestId('file').setInputFiles({
      name: 'movie.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 1]),
    })
    await expect(page.getByTestId('error')).toContainText('请输入至少一个时间点')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('video-thumbnail')
    await page.getByText('视频缩略图').first().click()
    await expect(page).toHaveURL(/\/tools\/video-thumbnail$/)
  })
})
