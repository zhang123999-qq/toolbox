/**
 * keyword-extract E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('keyword-extract', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/keyword-extract')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/关键词提取/)
  })

  test('输入文本后输出关键词', async ({ page }) => {
    await page.getByTestId('input').fill('人工智能改变世界，人工智能创造未来')
    await expect(page.getByTestId('output')).toContainText('人工智能')
  })

  test('TopN 非法 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('人工智能')
    await page.getByPlaceholder('20').fill('abc')
    await expect(page.getByTestId('output')).toContainText('TopN 必须是')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('keyword-extract')
    await page.getByText('关键词提取').first().click()
    await expect(page).toHaveURL(/\/tools\/keyword-extract$/)
  })
})
