/**
 * csv-to-json E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('csv-to-json', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/csv-to-json`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/CSV/)
  })

  test('示例 → 转换 → 输出 JSON 数组', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('"name": "工具库"')
    await expect(page.getByTestId('output')).toContainText('"local": true')
  })

  test('取消表头后输出二维数组', async ({ page }) => {
    await page.getByTestId('input').fill('name,tools\na,1')
    await page.getByLabel('首行为表头').uncheck()
    await expect(page.getByTestId('output')).toContainText('"name",')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('csv')
    await page.getByText('CSV 转 JSON').first().click()
    await expect(page).toHaveURL(/\/tools\/csv-to-json$/)
  })
})
