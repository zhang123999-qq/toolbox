/**
 * xml-formatter E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('xml-formatter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/xml-formatter`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/XML/)
  })

  test('示例 → 格式化 → 输出带缩进', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('<catalog>')
    await expect(page.getByTestId('output')).toContainText('  <book id="1">')
  })

  test('切到 minify 后输出压成单行', async ({ page }) => {
    await page.getByTestId('input').fill('<a>\n  <b>1</b>\n</a>')
    await page.getByLabel('模式').selectOption('minify')
    await expect(page.getByTestId('output')).toHaveText('<a><b>1</b></a>')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('xml')
    await page.getByText('XML 格式化').first().click()
    await expect(page).toHaveURL(/\/tools\/xml-formatter$/)
  })
})
