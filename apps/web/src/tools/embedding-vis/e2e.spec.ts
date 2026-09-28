/**
 * embedding-vis E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('embedding-vis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/embedding-vis')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/嵌入可视化/)
  })

  test('输入多行 → 渲染散点图', async ({ page }) => {
    await page.getByTestId('input').fill('水果：苹果香蕉\n交通：汽车火车')
    await expect(page.getByTestId('chart')).toBeVisible()
    await expect(page.getByTestId('points-info')).toContainText('共 2 个点')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('embedding-vis')
    await page.getByText('嵌入可视化').first().click()
    await expect(page).toHaveURL(/\/tools\/embedding-vis$/)
  })
})
