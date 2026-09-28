/**
 * sankey E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('sankey 桑基图 (#672)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/sankey')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/桑基图/)
  })

  test('点示例渲染出图表容器', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('chart-container')).toHaveCount(1)
  })

  test('非法输入显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('只有两列')
    await expect(page.getByRole('alert')).toContainText('每行须为 源')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('桑基图')
    await page.getByText('桑基图', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/sankey$/)
  })
})
