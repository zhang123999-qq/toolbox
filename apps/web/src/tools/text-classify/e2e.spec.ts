/**
 * text-classify E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('text-classify', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/text-classify')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/文本分类/)
  })

  test('未填 Key 点分类 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('苹果公司发布了新款手机')
    await page.getByTestId('classify').click()
    await expect(page.getByTestId('error')).toContainText('API Key 不能为空')
  })

  test('Key 输入框为密码框', async ({ page }) => {
    await expect(page.getByTestId('api-key')).toHaveAttribute('type', 'password')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('text-classify')
    await page.getByText('文本分类').first().click()
    await expect(page).toHaveURL(/\/tools\/text-classify$/)
  })
})
