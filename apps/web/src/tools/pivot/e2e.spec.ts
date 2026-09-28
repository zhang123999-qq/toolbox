/**
 * pivot E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('pivot 数据透视 (#685)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/pivot')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/数据透视/)
  })

  test('点示例渲染出透视表', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('pivot-table')).toHaveCount(1)
    await expect(page.getByTestId('pivot-table')).toContainText('行合计')
  })

  test('维度列名错误显示错误', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('input-rowKey').fill('城市')
    await expect(page.getByRole('alert')).toContainText('找不到行维度列')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('数据透视')
    await page.getByText('数据透视', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pivot$/)
  })
})
