/**
 * programmer-calc E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('programmer-calc', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/programmer-calc')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/程序员计算器/)
  })

  test('示例 → 输出四进制对照', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('十进制：14')
    await expect(page.getByTestId('output')).toContainText('十六进制：0xE')
  })

  test('输入移位表达式 → 输出对照', async ({ page }) => {
    await page.getByTestId('input').fill('1<<10')
    await expect(page.getByTestId('output')).toContainText('十进制：1024')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('程序员计算器')
    await page.getByText('程序员计算器').first().click()
    await expect(page).toHaveURL(/\/tools\/programmer-calc$/)
  })
})
