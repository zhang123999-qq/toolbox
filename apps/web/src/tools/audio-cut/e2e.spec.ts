/**
 * audio-cut E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('audio-cut', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/audio-cut')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/音频裁剪/)
  })

  test('载入示例音频 → 播放器出现并显示裁剪报告', async ({ page }) => {
    await page.getByTestId('example-audio').click()
    await expect(page.getByTestId('player')).toBeAttached({ timeout: 30000 })
    await expect(page.getByTestId('result-info')).toContainText('裁剪区间', { timeout: 30000 })
    await expect(page.getByTestId('result-info')).toContainText('输出时长：1.00 秒')
  })

  test('起止时间非法 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('example-audio').click()
    await expect(page.getByTestId('player')).toBeAttached({ timeout: 30000 })
    await page.getByTestId('option-start').fill('3')
    await page.getByTestId('option-end').fill('1')
    await page.getByTestId('reprocess').click()
    await expect(page.getByTestId('error')).toContainText('起始时间必须小于结束时间')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('audio-cut')
    await page.getByText('音频裁剪').first().click()
    await expect(page).toHaveURL(/\/tools\/audio-cut$/)
  })
})
