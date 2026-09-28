/**
 * data-table E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('data-table 数据表格 (#688)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/data-table')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/数据表格/)
  })

  test('点示例渲染出表格', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('data-grid')).toContainText('张三')
  })

  test('点击表头排序', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('th-1').click()
    await expect(page.getByTestId('th-1')).toContainText('▲')
  })

  test('搜索过滤', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('search').fill('上海')
    await expect(page.getByTestId('row-count')).toContainText('1 / 5')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('数据表格')
    await page.getByText('数据表格', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/data-table$/)
  })
})
