/**
 * voting E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('voting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/voting')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/投票/)
  })

  test('示例 → 显示开始投票按钮与本地保存提示', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('start-vote')).toBeVisible()
    await expect(page.getByTestId('output')).toContainText('结果仅保存在本页，刷新后丢失')
  })

  test('开始投票 → 投票 → 票数更新', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('start-vote').click()
    await page.getByTestId('vote-0').click()
    await page.getByTestId('vote-0').click()
    await page.getByTestId('vote-1').click()
    await expect(page.getByTestId('output')).toContainText('总票数：3')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('投票')
    await page.getByText('投票').first().click()
    await expect(page).toHaveURL(/\/tools\/voting$/)
  })
})
