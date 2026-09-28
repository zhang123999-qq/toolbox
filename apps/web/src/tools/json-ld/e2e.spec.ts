/**
 * json-ld E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('json-ld', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/json-ld')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/JSON-LD/)
  })

  test('示例生成 Article JSON-LD 代码', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('<script type="application/ld+json">')
    await expect(page.getByTestId('output')).toContainText('"@type": "Article"')
  })

  test('标题为空 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('Article 的 headline（标题）不能为空')
  })

  test('切换 FAQPage 类型后示例输出问答结构化数据', async ({ page }) => {
    await page.getByTestId('type-select').selectOption('FAQPage')
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('"@type": "FAQPage"')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('json-ld')
    await page.getByText('JSON-LD').first().click()
    await expect(page).toHaveURL(/\/tools\/json-ld$/)
  })
})
