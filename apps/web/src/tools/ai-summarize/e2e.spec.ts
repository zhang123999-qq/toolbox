/**
 * ai-summarize E2E（只写不运行）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 说明：用 page.route 拦截 chat/completions，不消耗真实 Key。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ai-summarize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/ai-summarize')
    await page.route('**/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: '这是模拟的摘要。' } }] }),
      })
    })
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/文本摘要/)
  })

  test('Key 为空时生成按钮禁用并提示', async ({ page }) => {
    await expect(page.getByTestId('generate')).toBeDisabled()
    await expect(page.getByTestId('key-hint')).toContainText('请先在上方填写 API Key')
    await expect(page.getByTestId('api-key')).toHaveAttribute('type', 'password')
  })

  test('填写 Key + 文本 → 生成摘要', async ({ page }) => {
    await page.getByTestId('input').fill('很长的一段文本内容，需要被压缩成摘要。')
    await page.getByTestId('api-key').fill('sk-e2e-test')
    await page.getByTestId('length-select').selectOption('brief')
    await page.getByTestId('generate').click()
    await expect(page.getByTestId('result')).toContainText('这是模拟的摘要。', { timeout: 30000 })
  })

  test('401 时提示 Key 无效', async ({ page }) => {
    await page.unroute('**/chat/completions')
    await page.route('**/chat/completions', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    })
    await page.getByTestId('input').fill('一些文本')
    await page.getByTestId('api-key').fill('sk-bad')
    await page.getByTestId('generate').click()
    await expect(page.getByTestId('error')).toContainText('API Key 无效或已过期', {
      timeout: 30000,
    })
  })

  test('清除 Key 后按钮重新禁用', async ({ page }) => {
    await page.getByTestId('api-key').fill('sk-e2e-test')
    await expect(page.getByTestId('generate')).toBeEnabled()
    await page.getByTestId('clear-key').click()
    await expect(page.getByTestId('generate')).toBeDisabled()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ai-summarize')
    await page.getByText('文本摘要').first().click()
    await expect(page).toHaveURL(/\/tools\/ai-summarize$/)
  })
})
