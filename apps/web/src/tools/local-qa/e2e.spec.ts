/**
 * local-qa E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('local-qa', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/local-qa')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/本地问答/)
  })

  test('示例 → 自动作答并展示证据', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('answer')).toContainText('复利计算公式')
    await expect(page.getByTestId('evidence').first()).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('local-qa')
    await page.getByText('本地问答').first().click()
    await expect(page).toHaveURL(/\/tools\/local-qa$/)
  })
})
