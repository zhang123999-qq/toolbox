/**
 * audio-to-text E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：E2E 环境需要授予麦克风权限且浏览器支持 Web Speech API；
 * 不支持时仅验证页面渲染与提示文案。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('audio-to-text', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/audio-to-text')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/音频转文字/)
  })

  test('渲染语言选择、听写按钮与转写区', async ({ page }) => {
    await expect(page.getByTestId('lang')).toBeAttached()
    await expect(page.getByTestId('start-stop')).toContainText('开始听写')
    await expect(page.getByTestId('transcript')).toBeAttached()
  })

  test('页面注明与「语音识别」工具的区别', async ({ page }) => {
    await expect(page.getByTestId('output')).toContainText('连续听写')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('audio-to-text')
    await page.getByText('音频转文字').first().click()
    await expect(page).toHaveURL(/\/tools\/audio-to-text$/)
  })
})
