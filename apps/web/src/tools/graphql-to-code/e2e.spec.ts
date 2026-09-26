/**
 * graphql-to-code E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('graphql-to-code', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/graphql-to-code`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/GraphQL/)
  })

  test('示例 → 输出 TS 变量与结果类型', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('export interface GetUserQuery')
  })

  test('语法错误的查询给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('query { user { ')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('graphql')
    await page.getByText('GraphQL 转代码').first().click()
    await expect(page).toHaveURL(/\/tools\/graphql-to-code$/)
  })
})
