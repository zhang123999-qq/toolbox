/**
 * data-filter E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('data-filter 数据过滤 (#689)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/data-filter')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/数据过滤/)
  })

  test('点示例命中 1 行', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('match-count')).toContainText('命中 1 / 5 行')
    await expect(page.getByTestId('result-grid')).toContainText('李四')
  })

  test('非法条件显示错误', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('input-conditions').fill('国家 = 中国')
    await page.getByTestId('run').click()
    await expect(page.getByRole('alert')).toContainText('不存在于表头')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('数据过滤')
    await page.getByText('数据过滤', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/data-filter$/)
  })
})
