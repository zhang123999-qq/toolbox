/**
 * probability E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('probability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/probability')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/概率计算/)
  })

  test('示例 → 输出二项分布结果', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('P(X = k): 0.117188')
  })

  test('缺失参数 → 输出区进入错误态', async ({ page }) => {
    await page.getByTestId('input').fill('n=10\nk=3')
    await expect(page.getByTestId('output')).toContainText('缺少参数')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('概率计算')
    await page.getByText('概率计算').first().click()
    await expect(page).toHaveURL(/\/tools\/probability$/)
  })
})
