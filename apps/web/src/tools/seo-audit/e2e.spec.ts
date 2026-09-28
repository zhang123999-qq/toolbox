/**
 * seo-audit E2E（只写不跑）
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 注意：只用「粘贴 HTML」模式，避免真实网络请求。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('seo-audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/seo-audit')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SEO 审计/)
  })

  test('示例 → 运行后输出总分与检查项', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('总分')
    await expect(page.getByTestId('output')).toContainText('title 标签')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('seo')
    await page.getByText('SEO 审计').first().click()
    await expect(page).toHaveURL(/\/tools\/seo-audit$/)
  })
})
