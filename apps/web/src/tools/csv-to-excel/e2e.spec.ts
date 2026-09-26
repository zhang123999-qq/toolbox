/**
 * csv-to-excel E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('csv-to-excel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/csv-to-excel`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/CSV/)
  })

  test('示例 → 转换 → 输出 SpreadsheetML', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText(
      '<?mso-application progid="Excel.Sheet"?>',
    )
  })

  test('切到 tsv 后输出制表符分隔的文本', async ({ page }) => {
    await page.getByTestId('input').fill('a,b\n1,2')
    await page.getByLabel('格式').selectOption('tsv')
    await expect(page.getByTestId('output')).toHaveText('a\tb\n1\t2')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('excel')
    await page.getByText('CSV 转 Excel').first().click()
    await expect(page).toHaveURL(/\/tools\/csv-to-excel$/)
  })
})
