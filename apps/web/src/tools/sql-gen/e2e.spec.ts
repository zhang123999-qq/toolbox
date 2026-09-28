/**
 * sql-gen E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('sql-gen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/sql-gen')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SQL 生成/)
  })

  test('未填 Key 点生成 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('查出所有用户')
    await page.getByTestId('generate').click()
    await expect(page.getByTestId('error')).toContainText('API Key 不能为空')
  })

  test('Key 输入框为密码框', async ({ page }) => {
    await expect(page.getByTestId('api-key')).toHaveAttribute('type', 'password')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('sql-gen')
    await page.getByText('SQL 生成').first().click()
    await expect(page).toHaveURL(/\/tools\/sql-gen$/)
  })
})
