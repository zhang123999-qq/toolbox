/**
 * metronome E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('metronome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/metronome')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/节拍器/)
  })

  test('点开始 → 显示拍号标签与停止按钮', async ({ page }) => {
    await page.getByTestId('start-stop').click()
    await expect(page.getByTestId('tempo-label')).toContainText('120 BPM · 4/4 拍')
    await expect(page.getByTestId('start-stop')).toContainText('停止')
    await page.getByTestId('start-stop').click()
    await expect(page.getByTestId('start-stop')).toContainText('开始')
  })

  test('BPM 非法 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('option-bpm').fill('9999')
    await page.getByTestId('start-stop').click()
    await expect(page.getByTestId('error')).toContainText('BPM 不能大于')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('metronome')
    await page.getByText('节拍器').first().click()
    await expect(page).toHaveURL(/\/tools\/metronome$/)
  })
})
