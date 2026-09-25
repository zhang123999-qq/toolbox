/**
 * passphrase E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('passphrase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/passphrase')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/密码短语/)
  })

  test('示例 → 运行 → 输出 4 段单词短语', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toHaveText(/^[a-z]{3,8}(-[a-z]{3,8}){3}$/)
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('passphrase')
    await page.getByText('密码短语').first().click()
    await expect(page).toHaveURL(/\/tools\/passphrase$/)
  })
})
