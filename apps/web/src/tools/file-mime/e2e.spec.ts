/**
 * file-mime E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('file-mime', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/file-mime')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/MIME 类型查询/)
  })

  test('示例 → 运行 → 输出 MIME 映射', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('image/png', { timeout: 30000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('file-mime')
    await page.getByText('MIME 类型查询').first().click()
    await expect(page).toHaveURL(/\/tools\/file-mime$/)
  })
})
