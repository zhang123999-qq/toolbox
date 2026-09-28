/**
 * subtitle-burn E2E（只写不运行）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：烧录需要下载 ffmpeg.wasm（十几 MB），用例超时放宽到 120 秒。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:04,000
你好，欢迎使用字幕烧录工具。

2
00:00:05,000 --> 00:00:08,500
这条字幕会被烧录进视频画面。
`

test.describe('subtitle-burn', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/subtitle-burn')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/字幕烧录/)
  })

  test('示例字幕解析出条目数', async ({ page }) => {
    await page.getByTestId('example-subtitle').click()
    await expect(page.getByTestId('subtitle-info')).toContainText('解析出 2 条字幕')
  })

  test('上传非法字幕给出中文报错', async ({ page }) => {
    await page.getByTestId('subtitle-input').setInputFiles({
      name: 'bad.srt',
      mimeType: 'text/plain',
      buffer: Buffer.from('这根本不是字幕'),
    })
    await expect(page.getByTestId('error')).toBeVisible()
  })

  test('样式选项可切换：字号 / 颜色 / 位置', async ({ page }) => {
    await page.getByTestId('font-size').fill('32')
    await page.getByTestId('position').selectOption('top')
    await expect(page.getByTestId('font-size')).toHaveValue('32')
    await expect(page.getByTestId('position')).toHaveValue('top')
  })

  test('完整烧录流程（需真实视频文件，较慢）', async ({ page }) => {
    test.setTimeout(180000)
    // 注意：CI 环境请准备一个小的 mp4 fixture 后取消跳过
    test.skip(!process.env.E2E_VIDEO_FIXTURE, '需要 E2E_VIDEO_FIXTURE 指向一个小体积 mp4 文件')
    await page.getByTestId('video-input').setInputFiles(process.env.E2E_VIDEO_FIXTURE as string)
    await page.getByTestId('subtitle-input').setInputFiles({
      name: 'sub.srt',
      mimeType: 'text/plain',
      buffer: Buffer.from(SAMPLE_SRT),
    })
    await page.getByTestId('burn').click()
    await expect(page.getByTestId('result-video')).toBeVisible({ timeout: 120000 })
    await expect(page.getByTestId('download-link')).toHaveAttribute('download', /-sub\.mp4$/)
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('subtitle-burn')
    await page.getByText('字幕烧录').first().click()
    await expect(page).toHaveURL(/\/tools\/subtitle-burn$/)
  })
})
