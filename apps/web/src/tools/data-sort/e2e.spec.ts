/**
 * data-sort E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('data-sort 数据排序 (#690)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/data-sort')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/数据排序/)
  })

  test('点示例按规则排序', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('sort-info')).toContainText('年龄 desc')
    const firstCell = page.getByTestId('result-grid').locator('tbody tr td:first-child').first()
    await expect(firstCell).toContainText('赵六')
  })

  test('非法规则显示错误', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('input-sortSpec').fill('年龄:up')
    await page.getByTestId('run').click()
    await expect(page.getByRole('alert')).toContainText('方向须为 asc 或 desc')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('数据排序')
    await page.getByText('数据排序', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/data-sort$/)
  })
})
