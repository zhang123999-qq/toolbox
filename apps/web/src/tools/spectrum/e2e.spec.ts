/**
 * spectrum E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('spectrum', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/spectrum')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/频谱分析/)
  })

  test('载入示例音频 → 绘制频谱并显示峰值', async ({ page }) => {
    await page.getByTestId('example-audio').click()
    await expect(page.getByTestId('peak-info')).toContainText('峰值频率', { timeout: 30000 })
    await expect(page.getByTestId('spectrum-canvas')).toBeAttached()
  })

  test('FFT 点数非法 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('option-fftSize').fill('1000')
    await page.getByTestId('example-audio').click()
    await expect(page.getByTestId('error')).toContainText('FFT 点数须为')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('spectrum')
    await page.getByText('频谱分析').first().click()
    await expect(page).toHaveURL(/\/tools\/spectrum$/)
  })
})
