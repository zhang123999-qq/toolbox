/**
 * video-editor E2E（只写不运行）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：导出需要下载 ffmpeg.wasm（十几 MB），用例超时放宽到 120 秒。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('video-editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/video-editor')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/视频剪辑/)
  })

  test('添加片段：多种时间写法都被接受', async ({ page }) => {
    await page.getByTestId('seg-start').fill('0')
    await page.getByTestId('seg-end').fill('1:30')
    await page.getByTestId('seg-add').click()
    await expect(page.getByTestId('segment-list').locator('li')).toHaveCount(1)
    await expect(page.getByTestId('segment-list')).toContainText('00:00.00 → 01:30.00')
    await page.getByTestId('seg-start').fill('01:02:03')
    await page.getByTestId('seg-end').fill('01:02:10')
    await page.getByTestId('seg-add').click()
    await expect(page.getByTestId('segment-list').locator('li')).toHaveCount(2)
  })

  test('结束早于开始时中文报错', async ({ page }) => {
    await page.getByTestId('seg-start').fill('10')
    await page.getByTestId('seg-end').fill('5')
    await page.getByTestId('seg-add').click()
    await expect(page.getByTestId('error')).toContainText('起始时间必须小于结束时间')
  })

  test('完整导出流程（需真实视频文件，较慢）', async ({ page }) => {
    test.setTimeout(180000)
    test.skip(!process.env.E2E_VIDEO_FIXTURE, '需要 E2E_VIDEO_FIXTURE 指向一个小体积 mp4 文件')
    await page.getByTestId('video-input').setInputFiles(process.env.E2E_VIDEO_FIXTURE as string)
    await page.getByTestId('seg-start').fill('0')
    await page.getByTestId('seg-end').fill('5')
    await page.getByTestId('seg-add').click()
    await page.getByTestId('export').click()
    await expect(page.getByTestId('result-video')).toBeVisible({ timeout: 120000 })
    await expect(page.getByTestId('download-link')).toHaveAttribute('download', /-edit\.mp4$/)
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('video-editor')
    await page.getByText('视频剪辑').first().click()
    await expect(page).toHaveURL(/\/tools\/video-editor$/)
  })
})
