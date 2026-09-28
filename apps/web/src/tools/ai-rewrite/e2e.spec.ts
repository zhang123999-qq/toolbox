/**
 * ai-rewrite E2E（只写不运行）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 说明：用 page.route 拦截 chat/completions，不消耗真实 Key。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ai-rewrite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/ai-rewrite')
    await page.route('**/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: '这是模拟的改写结果。' } }] }),
      })
    })
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/文本改写/)
  })

  test('四种改写风格可选', async ({ page }) => {
    await expect(page.getByTestId('style-select').locator('option')).toHaveCount(4)
  })

  test('填写 Key + 文本 → 改写成功', async ({ page }) => {
    await page.getByTestId('input').fill('这是一段需要改写的文本。')
    await page.getByTestId('api-key').fill('sk-e2e-test')
    await page.getByTestId('style-select').selectOption('formal')
    await page.getByTestId('generate').click()
    await expect(page.getByTestId('result')).toContainText('这是模拟的改写结果。', {
      timeout: 30000,
    })
  })

  test('文本为空时中文提示且不发请求', async ({ page }) => {
    let requested = false
    await page.unroute('**/chat/completions')
    await page.route('**/chat/completions', async (route) => {
      requested = true
      await route.fulfill({ status: 200, body: '{}' })
    })
    await page.getByTestId('api-key').fill('sk-e2e-test')
    await page.getByTestId('generate').click()
    await expect(page.getByTestId('error')).toContainText('请输入要改写的文本')
    expect(requested).toBe(false)
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ai-rewrite')
    await page.getByText('文本改写').first().click()
    await expect(page).toHaveURL(/\/tools\/ai-rewrite$/)
  })
})
