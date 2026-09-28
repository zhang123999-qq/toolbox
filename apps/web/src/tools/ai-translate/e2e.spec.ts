/**
 * ai-translate E2E（只写不运行）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 说明：用 page.route 拦截 chat/completions，不消耗真实 Key。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ai-translate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/ai-translate')
    await page.route('**/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: '你好，世界' } }] }),
      })
    })
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/翻译/)
  })

  test('语言下拉框为中文友好名', async ({ page }) => {
    await expect(page.getByTestId('source-lang').locator('option').first()).toContainText(
      '自动检测',
    )
    await expect(page.getByTestId('target-lang').locator('option').first()).toContainText('中文')
  })

  test('选择语言对 → 翻译成功', async ({ page }) => {
    await page.getByTestId('input').fill('Hello world')
    await page.getByTestId('api-key').fill('sk-e2e-test')
    await page.getByTestId('source-lang').selectOption('en')
    await page.getByTestId('target-lang').selectOption('zh')
    await page.getByTestId('generate').click()
    await expect(page.getByTestId('result')).toContainText('你好，世界', { timeout: 30000 })
  })

  test('源语言与目标语言相同时中文提示', async ({ page }) => {
    await page.getByTestId('input').fill('你好')
    await page.getByTestId('api-key').fill('sk-e2e-test')
    await page.getByTestId('source-lang').selectOption('zh')
    await page.getByTestId('target-lang').selectOption('zh')
    await page.getByTestId('generate').click()
    await expect(page.getByTestId('error')).toContainText('源语言与目标语言相同')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ai-translate')
    await page.getByText('翻译').first().click()
    await expect(page).toHaveURL(/\/tools\/ai-translate$/)
  })
})
