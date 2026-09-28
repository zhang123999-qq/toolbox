/**
 * ass-convert E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ass-convert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/ass-convert')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/ASS字幕转换/)
  })

  test('载入示例 → 转 SRT 并显示序号', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('result-text')).toContainText('1\n00:00:01,000 --> 00:00:04,000')
  })

  test('非法输入 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('[Script Info]\nTitle: x')
    await expect(page.getByTestId('error')).toContainText('[Events]')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ass-convert')
    await page.getByText('ASS字幕转换').first().click()
    await expect(page).toHaveURL(/\/tools\/ass-convert$/)
  })
})
