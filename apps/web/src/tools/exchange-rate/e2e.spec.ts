/**
 * exchange-rate E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('exchange-rate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/exchange-rate')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/汇率换算/)
  })

  test('示例按钮填入金额（实际调用需自备 Key，不在 E2E 里发请求）', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('input')).toHaveValue('100')
  })

  test('未填 Key 点运行会提示填写', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('请先填写 API Key')
  })

  test('API Key 输入框为密码类型', async ({ page }) => {
    await expect(page.getByTestId('input-apiKey')).toHaveAttribute('type', 'password')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('exchange-rate')
    await page.getByText('汇率换算').first().click()
    await expect(page).toHaveURL(/\/tools\/exchange-rate$/)
  })
})
