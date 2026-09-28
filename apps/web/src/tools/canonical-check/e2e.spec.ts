/**
 * canonical-check E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('canonical-check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/canonical-check')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/规范链接检查/)
  })

  test('自指 canonical 显示无问题结论', async ({ page }) => {
    await page.getByTestId('input').fill('<link rel="canonical" href="https://example.com/a">')
    await page.getByTestId('input-pageUrl').fill('https://example.com/a')
    await expect(page.getByTestId('output')).toContainText('设置正确')
  })

  test('缺失 canonical 显示警告', async ({ page }) => {
    await page.getByTestId('input').fill('<p>无 canonical</p>')
    await expect(page.getByTestId('output')).toContainText('未找到')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('canonical-check')
    await page.getByText('规范链接检查').first().click()
    await expect(page).toHaveURL(/\/tools\/canonical-check$/)
  })
})
