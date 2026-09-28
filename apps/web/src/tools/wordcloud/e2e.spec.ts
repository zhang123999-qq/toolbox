/**
 * wordcloud E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('wordcloud 词云 (#675)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/wordcloud')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/词云/)
  })

  test('点示例渲染出词云画布与词数', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('wordcloud-canvas')).toHaveCount(1)
    await expect(page.getByTestId('word-count')).toContainText(/共 \d+ 个词/)
  })

  test('非法显示词数显示错误', async ({ page }) => {
    await page.getByTestId('example').click()
    const topN = page.getByText('显示词数').locator('input')
    await topN.fill('abc')
    await expect(page.getByRole('alert')).toContainText('显示词数')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('词云')
    await page.getByText('词云', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/wordcloud$/)
  })
})
