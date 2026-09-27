/**
 * poster E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('poster', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/poster')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/海报生成/)
  })

  test('示例 → 预览出现标题', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('poster-preview')).toContainText('金秋大促')
  })

  test('导出 PNG 按钮存在', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('export-png')).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('海报生成')
    await page.getByText('海报生成').first().click()
    await expect(page).toHaveURL(/\/tools\/poster$/)
  })
})
