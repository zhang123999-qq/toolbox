/**
 * zodiac-match E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('zodiac-match', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/zodiac-match')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/星座配对/)
  })

  test('默认展示白羊 × 天秤的配对评分', async ({ page }) => {
    await expect(page.getByTestId('output')).toContainText('配对评分：93 / 100')
  })

  test('示例按钮填入名字并更新报告', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('input')).toHaveValue('小明')
    await expect(page.getByTestId('output')).toContainText('小明（白羊座 Aries）')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('zodiac-match')
    await page.getByText('星座配对').first().click()
    await expect(page).toHaveURL(/\/tools\/zodiac-match$/)
  })
})
