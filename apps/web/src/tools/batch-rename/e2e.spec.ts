/**
 * batch-rename E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('batch-rename', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/batch-rename')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/批量重命名/)
  })

  test('示例 → 运行 → 输出对照表', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('对照表', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('batch-rename')
    await page.getByText('批量重命名').first().click()
    await expect(page).toHaveURL(/\/tools\/batch-rename$/)
  })
})
