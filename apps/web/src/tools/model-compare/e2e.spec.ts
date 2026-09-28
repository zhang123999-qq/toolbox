/**
 * model-compare E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('model-compare', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/model-compare')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/模型对比/)
  })

  test('未填 Key 点对比 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('用一句话解释什么是复利。')
    await page.getByTestId('compare').click()
    await expect(page.getByTestId('error')).toContainText('API Key 不能为空')
  })

  test('两侧 Key 输入框均为密码框', async ({ page }) => {
    await expect(page.getByTestId('a-key')).toHaveAttribute('type', 'password')
    await expect(page.getByTestId('b-key')).toHaveAttribute('type', 'password')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('model-compare')
    await page.getByText('模型对比').first().click()
    await expect(page).toHaveURL(/\/tools\/model-compare$/)
  })
})
