/**
 * utm E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('utm', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/utm')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/UTM 生成/)
  })

  test('填入参数后输出带参 URL', async ({ page }) => {
    await page.getByTestId('input').fill('https://example.com/landing')
    await page.getByPlaceholder('google').fill('google')
    await page.getByPlaceholder('cpc').fill('cpc')
    await page.getByPlaceholder('spring_sale').fill('sale')
    await expect(page.getByTestId('output')).toContainText('utm_source=google')
  })

  test('未填参数 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('https://example.com')
    await expect(page.getByTestId('output')).toContainText('utm_source 不能为空')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('utm')
    await page.getByText('UTM 生成').first().click()
    await expect(page).toHaveURL(/\/tools\/utm$/)
  })
})
