/**
 * prompt-optimize E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('prompt-optimize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/prompt-optimize')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/提示词优化/)
  })

  test('未填 Key 点优化 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('写一篇关于远程办公的文章')
    await page.getByTestId('optimize').click()
    await expect(page.getByTestId('error')).toContainText('API Key 不能为空')
  })

  test('Key 密码框与清除按钮存在', async ({ page }) => {
    await expect(page.getByTestId('api-key')).toHaveAttribute('type', 'password')
    await expect(page.getByTestId('clear-key')).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('prompt-optimize')
    await page.getByText('提示词优化').first().click()
    await expect(page).toHaveURL(/\/tools\/prompt-optimize$/)
  })
})
