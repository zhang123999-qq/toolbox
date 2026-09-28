/**
 * video-merge E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('video-merge', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/video-merge')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/视频合并/)
  })

  test('只选 1 个文件 → 提示至少需要 2 个', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'a.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(1024),
    })
    await page.getByTestId('merge').click()
    await expect(page.getByTestId('error')).toContainText('至少需要 2 个视频')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('video-merge')
    await page.getByText('视频合并').first().click()
    await expect(page).toHaveURL(/\/tools\/video-merge$/)
  })
})
