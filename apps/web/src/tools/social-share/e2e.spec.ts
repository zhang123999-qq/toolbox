/**
 * social-share E2E（只写不跑）
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 注意：本工具纯前端拼链接，无网络请求，离线也可跑。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('social-share', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/social-share')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/社交分享链接/)
  })

  test('示例 → 运行后生成分享链接', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('twitter.com/intent')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('社交分享')
    await page.getByText('社交分享链接').first().click()
    await expect(page).toHaveURL(/\/tools\/social-share$/)
  })
})
