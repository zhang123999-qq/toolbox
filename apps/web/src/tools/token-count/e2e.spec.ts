/**
 * token-count E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('token-count', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/token-count')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Token计数/)
  })

  test('统计示例文本 → 显示 token 数', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('count').click()
    await expect(page.getByTestId('token-result')).toContainText('个 token', { timeout: 30000 })
  })

  test('可切换分词器', async ({ page }) => {
    await expect(page.getByTestId('option-tokenizer')).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('token-count')
    await page.getByText('Token计数').first().click()
    await expect(page).toHaveURL(/\/tools\/token-count$/)
  })
})
