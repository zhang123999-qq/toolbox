/**
 * ocr-post E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ocr-post', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/ocr-post')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/OCR后处理/)
  })

  test('输入 OCR 文本 → 自动纠错', async ({ page }) => {
    await page.getByTestId('input').fill('Ｔｅｓｔ\n你 好')
    await expect(page.getByTestId('fixed-text')).toContainText('Test 你好')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ocr-post')
    await page.getByText('OCR后处理').first().click()
    await expect(page).toHaveURL(/\/tools\/ocr-post$/)
  })
})
