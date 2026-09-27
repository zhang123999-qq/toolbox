/**
 * base-convert E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('base-convert', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/base-convert')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/进制转换/)
  })

  test('示例 → 输出 255 (10进制) = FF (16进制)', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toHaveText('255 (10进制) = FF (16进制)')
  })

  test('输入十进制数 → 输出十六进制对照', async ({ page }) => {
    await page.getByTestId('input').fill('16')
    await expect(page.getByTestId('output')).toHaveText('16 (10进制) = 10 (16进制)')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('进制转换')
    await page.getByText('进制转换').first().click()
    await expect(page).toHaveURL(/\/tools\/base-convert$/)
  })
})
