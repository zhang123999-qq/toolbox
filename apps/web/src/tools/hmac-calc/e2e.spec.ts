/**
 * hmac-calc E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('hmac-calc', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/hmac-calc')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/HMAC 计算/)
  })

  test('示例 → 运行 → 输出为标准向量', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText(
      'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
    )
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('hmac-calc')
    await page.getByText('HMAC 计算').first().click()
    await expect(page).toHaveURL(/\/tools\/hmac-calc$/)
  })
})
