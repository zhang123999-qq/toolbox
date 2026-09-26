/**
 * schema-diff E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('schema-diff', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/schema-diff`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Schema/)
  })

  test('示例 → 对比 → 输出类型变更与新增表', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText(
      '~ users.email  类型: varchar(100) → varchar(255)',
    )
    await expect(page.getByTestId('output')).toContainText('+ logs')
  })

  test('切到 markdown 后输出表格', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByLabel('格式').selectOption('markdown')
    await expect(page.getByTestId('output')).toContainText('| 字段 | 属性 | 旧值 | 新值 |')
  })

  test('非法输入时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('{oops')
    await page.getByTestId('input-schemaB').fill('{"t":{"a":{"type":"int"}}}')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('schema')
    await page.getByText('Schema Diff').first().click()
    await expect(page).toHaveURL(/\/tools\/schema-diff$/)
  })
})
