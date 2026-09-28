/**
 * mobile-friendly E2E（粘贴分析用例纯离线）
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('mobile-friendly', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/mobile-friendly')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/移动友好检测/)
  })

  test('粘贴分析：示例 HTML 输出得分', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('移动友好得分')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('移动友好')
    await page.getByText('移动友好检测').first().click()
    await expect(page).toHaveURL(/\/tools\/mobile-friendly$/)
  })
})
