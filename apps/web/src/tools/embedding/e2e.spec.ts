/**
 * embedding E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('embedding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/embedding')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/文本嵌入/)
  })

  test('输入文本 → 显示向量预览', async ({ page }) => {
    await page.getByTestId('input').fill('今天天气不错')
    await expect(page.getByTestId('vector-preview')).toContainText('共 256 维')
  })

  test('输入文本 B → 显示相似度', async ({ page }) => {
    await page.getByTestId('input').fill('苹果香蕉')
    await page.getByTestId('input-textB').fill('苹果香蕉')
    await expect(page.getByTestId('similarity')).toContainText('1.0000')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('embedding')
    await page.getByText('文本嵌入').first().click()
    await expect(page).toHaveURL(/\/tools\/embedding$/)
  })
})
