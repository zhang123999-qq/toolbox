/**
 * blake3-hash E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('blake3-hash', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/blake3-hash')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/BLAKE3 哈希/)
  })

  test('示例 → 运行 → 输出官方向量的摘要', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toHaveText(
      'ea8f163db38682925e4491c5e58d4bb3506ef8c14eb78a86e908c5624a67200f',
      { timeout: 30000 },
    )
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('blake3')
    await page.getByText('BLAKE3 哈希').first().click()
    await expect(page).toHaveURL(/\/tools\/blake3-hash$/)
  })
})
