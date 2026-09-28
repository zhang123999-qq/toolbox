/**
 * video-cut E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('video-cut', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/video-cut')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/视频裁剪/)
  })

  test('未选文件点裁剪 → 提示先选文件', async ({ page }) => {
    await page.getByTestId('cut').click()
    await expect(page.getByTestId('error')).toContainText('请先选择视频文件')
  })

  test('起止时间非法 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('option-start').fill('3')
    await page.getByTestId('option-end').fill('1')
    // 先选一个空文件以通过「先选文件」检查
    await page.getByTestId('file').setInputFiles({
      name: 'clip.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(1024),
    })
    await page.getByTestId('cut').click()
    await expect(page.getByTestId('error')).toContainText('起始时间必须小于结束时间')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('video-cut')
    await page.getByText('视频裁剪').first().click()
    await expect(page).toHaveURL(/\/tools\/video-cut$/)
  })
})
