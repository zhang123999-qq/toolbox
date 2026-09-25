/**
 * key-generate E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('key-generate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/key-generate')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/密钥生成/)
  })

  test('示例 → 运行 → 输出 32 位十六进制密钥', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toHaveText(/^[0-9a-f]{32}$/, { timeout: 15000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('key-generate')
    await page.getByText('密钥生成').first().click()
    await expect(page).toHaveURL(/\/tools\/key-generate$/)
  })
})
