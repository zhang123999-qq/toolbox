/**
 * waveform E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('waveform', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/waveform')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/波形显示/)
  })

  test('载入示例音频 → 绘制波形并显示时间范围', async ({ page }) => {
    await page.getByTestId('example-audio').click()
    await expect(page.getByTestId('time-info')).toContainText('00:00.000 – 00:03.000', {
      timeout: 30000,
    })
  })

  test('放大 → 显示范围缩小', async ({ page }) => {
    await page.getByTestId('example-audio').click()
    await expect(page.getByTestId('time-info')).toContainText('00:00.000 – 00:03.000', {
      timeout: 30000,
    })
    await page.getByTestId('zoom-in').click()
    await expect(page.getByTestId('time-info')).toContainText('00:00.750 – 00:02.250')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('waveform')
    await page.getByText('波形显示').first().click()
    await expect(page).toHaveURL(/\/tools\/waveform$/)
  })
})
