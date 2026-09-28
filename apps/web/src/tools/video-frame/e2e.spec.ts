/**
 * video-frame E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('video-frame', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/video-frame')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/视频截图/)
  })

  test('渲染文件选择器、时间输入与抓帧按钮', async ({ page }) => {
    await expect(page.getByTestId('video-input')).toBeAttached()
    await expect(page.getByTestId('time-input')).toBeAttached()
    await expect(page.getByTestId('capture')).toBeDisabled()
  })

  test('未选视频时抓帧按钮禁用', async ({ page }) => {
    await expect(page.getByTestId('capture')).toBeDisabled()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('video-frame')
    await page.getByText('视频截图').first().click()
    await expect(page).toHaveURL(/\/tools\/video-frame$/)
  })
})
