/**
 * random-number E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('random-number', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/random-number')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/随机数/)
  })

  test('示例 → 输出 5 个 1–100 的整数', async ({ page }) => {
    await page.getByTestId('example').click()
    const text = (await page.getByTestId('output').textContent()) ?? ''
    const numbers = text.trim().split(/\s+/)
    expect(numbers).toHaveLength(5)
    for (const raw of numbers) {
      const n = Number(raw)
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(100)
    }
  })

  test('非法范围 → 输出错误提示', async ({ page }) => {
    await page.getByTestId('input-min').fill('10')
    await page.getByTestId('input-max').fill('1')
    await expect(page.getByTestId('output').getByRole('alert')).toContainText('不能大于最大值')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('随机数')
    await page.getByText('随机数').first().click()
    await expect(page).toHaveURL(/\/tools\/random-number$/)
  })
})
