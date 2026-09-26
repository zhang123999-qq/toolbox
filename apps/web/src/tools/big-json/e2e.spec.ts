/**
 * big-json E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('big-json', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/big-json`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/JSON/)
  })

  test('示例 → 扫描 → 输出规模统计', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('最大嵌套深度：3')
  })

  test('切到 error 模式能定位语法错误', async ({ page }) => {
    await page.getByTestId('input').fill('{\n  "a": [1,]\n}')
    await page.getByLabel('模式').selectOption('error')
    await expect(page.getByTestId('output')).toContainText('第 2 行第 11 列')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('json')
    await page.getByText('BigJSON 流式').first().click()
    await expect(page).toHaveURL(/\/tools\/big-json$/)
  })
})
