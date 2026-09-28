/**
 * srt-convert E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('srt-convert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/srt-convert')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SRT字幕转换/)
  })

  test('载入示例 → 转 VTT 并显示 WEBVTT 文件头', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('result-text')).toContainText('WEBVTT')
    await expect(page.getByTestId('result-text')).toContainText('00:00:01.000 --> 00:00:04.000')
  })

  test('非法输入 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('这不是字幕')
    await expect(page.getByTestId('error')).toContainText('缺少时间轴')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('srt-convert')
    await page.getByText('SRT字幕转换').first().click()
    await expect(page).toHaveURL(/\/tools\/srt-convert$/)
  })
})
