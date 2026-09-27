/**
 * dice E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('dice', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/dice')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/骰子/)
  })

  test('示例 → 掷出 2 个骰子并显示总点数', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('dice-faces')).toBeVisible()
    await expect(page.getByTestId('output')).toContainText('掷骰结果')
    await expect(page.getByTestId('output')).toContainText('总点数')
  })

  test('点「掷骰子」→ 重新掷骰', async ({ page }) => {
    await page.getByTestId('example').click()
    const faces = page.getByTestId('dice-faces')
    const before = await faces.evaluate((el) => el.getAttribute('data-round'))
    await page.getByTestId('roll').click()
    const after = await faces.evaluate((el) => el.getAttribute('data-round'))
    expect(after).not.toBe(before)
  })

  test('骰子面数非法 → 错误态', async ({ page }) => {
    await page.getByTestId('input').fill('2')
    await page.getByTestId('input-sides').fill('1')
    await expect(page.getByTestId('output')).toContainText('骰子面数无效')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('骰子')
    await page.getByText('骰子').first().click()
    await expect(page).toHaveURL(/\/tools\/dice$/)
  })
})
