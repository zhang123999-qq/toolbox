/**
 * date-diff E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('date-diff', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/date-diff')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/日期间隔/)
  })

  test('示例 → 输出两个日期的复合间隔', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('复合间隔：1 年 2 个月 14 天')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('日期间隔')
    await page.getByText('日期间隔').first().click()
    await expect(page).toHaveURL(/\/tools\/date-diff$/)
  })
})
