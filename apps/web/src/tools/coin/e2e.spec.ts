/**
 * coin E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('coin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/coin')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/硬币/)
  })

  test('示例 → 大硬币显示正面或反面', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('coin-face')).toBeVisible()
    const face = await page.getByTestId('coin-face').textContent()
    expect(['正面', '反面']).toContain(face?.trim())
  })

  test('点「抛硬币」→ 重新抛掷', async ({ page }) => {
    await page.getByTestId('example').click()
    const coin = page.getByTestId('coin-face')
    const before = await coin.evaluate((el) => el.getAttribute('data-round'))
    await page.getByTestId('flip').click()
    const after = await coin.evaluate((el) => el.getAttribute('data-round'))
    expect(after).not.toBe(before)
  })

  test('抛掷次数非法 → 错误态', async ({ page }) => {
    await page.getByTestId('input').fill('0')
    await expect(page.getByTestId('output')).toContainText('抛掷次数无效')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('硬币')
    await page.getByText('硬币').first().click()
    await expect(page).toHaveURL(/\/tools\/coin$/)
  })
})
