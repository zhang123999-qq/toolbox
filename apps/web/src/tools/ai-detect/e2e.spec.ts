/**
 * ai-detect E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ai-detect', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/ai-detect')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/AI 检测/)
  })

  test('未填 Key 点检测 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('这是一段足够长的待检测文本。'.repeat(10))
    await page.getByTestId('detect').click()
    await expect(page.getByTestId('error')).toContainText('API Key 不能为空')
  })

  test('Key 输入框为密码框', async ({ page }) => {
    await expect(page.getByTestId('api-key')).toHaveAttribute('type', 'password')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ai-detect')
    await page.getByText('AI 检测').first().click()
    await expect(page).toHaveURL(/\/tools\/ai-detect$/)
  })
})
