/**
 * argon2-hash E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：Argon2 的 WASM 只有在真实浏览器里才会加载，本用例跑的是构建产物。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('argon2-hash', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/argon2-hash')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Argon2 哈希/)
  })

  test('示例 → 运行 → 输出 PHC 串', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toHaveText(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/, {
      timeout: 30000,
    })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('argon2')
    await page.getByText('Argon2 哈希').first().click()
    await expect(page).toHaveURL(/\/tools\/argon2-hash$/)
  })
})
