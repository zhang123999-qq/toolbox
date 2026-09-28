/**
 * audio-visualizer E2E（只写不运行）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('audio-visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/audio-visualizer')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/音频可视化/)
  })

  test('载入示例音频 → 播放状态显示文件名', async ({ page }) => {
    await page.getByTestId('example-audio').click()
    await expect(page.getByTestId('file-name')).toContainText('示例音频.wav', { timeout: 30000 })
    await expect(page.getByTestId('play-pause')).toContainText('暂停')
  })

  test('暂停 / 继续切换按钮文案', async ({ page }) => {
    await page.getByTestId('example-audio').click()
    await expect(page.getByTestId('file-name')).toContainText('示例音频.wav', { timeout: 30000 })
    await page.getByTestId('play-pause').click()
    await expect(page.getByTestId('play-pause')).toContainText('继续')
    await page.getByTestId('play-pause').click()
    await expect(page.getByTestId('play-pause')).toContainText('暂停')
  })

  test('三种样式可切换', async ({ page }) => {
    const select = page.getByTestId('style-select')
    await expect(select.locator('option')).toHaveCount(3)
    await select.selectOption('wave')
    await expect(select).toHaveValue('wave')
    await select.selectOption('circle')
    await expect(select).toHaveValue('circle')
  })

  test('画布存在且有尺寸', async ({ page }) => {
    const canvas = page.getByTestId('visual-canvas')
    await expect(canvas).toBeVisible()
    expect(await canvas.getAttribute('width')).toBe('640')
    expect(await canvas.getAttribute('height')).toBe('320')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('audio-visualizer')
    await page.getByText('音频可视化').first().click()
    await expect(page).toHaveURL(/\/tools\/audio-visualizer$/)
  })
})
