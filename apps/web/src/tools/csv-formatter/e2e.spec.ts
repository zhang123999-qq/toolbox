/**
 * csv-formatter E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('csv-formatter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/csv-formatter`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/CSV/)
  })

  test('示例 → 对齐 → 输出列宽一致的表格', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('name   ,tools')
  })

  test('切到 validate 后输出列数校验报告', async ({ page }) => {
    await page.getByTestId('input').fill('a,b,c\n1,2')
    await page.getByRole('combobox', { name: '模式' }).selectOption('validate')
    await expect(page.getByTestId('output')).toContainText('列数不一致')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('csv')
    await page.getByText('CSV 格式化').first().click()
    await expect(page).toHaveURL(/\/tools\/csv-formatter$/)
  })
})
