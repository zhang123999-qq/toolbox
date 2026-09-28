/**
 * code-explain E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('code-explain', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/code-explain')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/代码解释/)
  })

  test('未填 Key 点解释 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('def fib(n):\n    return n')
    await page.getByTestId('explain').click()
    await expect(page.getByTestId('error')).toContainText('API Key 不能为空')
  })

  test('Key 输入框为密码框', async ({ page }) => {
    await expect(page.getByTestId('api-key')).toHaveAttribute('type', 'password')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('code-explain')
    await page.getByText('代码解释').first().click()
    await expect(page).toHaveURL(/\/tools\/code-explain$/)
  })
})
