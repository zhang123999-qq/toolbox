/**
 * due-date E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('due-date', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/due-date')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/预产期/)
  })

  test('示例 → 输出预产期与孕周', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('2027-03-08')
    await expect(page.getByTestId('output')).toContainText('孕 16 周 6 天')
  })

  test('非法日期 → 输出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('not-a-date')
    await expect(page.getByTestId('output').getByRole('alert')).toContainText('无法解析的日期')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('预产期')
    await page.getByText('预产期').first().click()
    await expect(page).toHaveURL(/\/tools\/due-date$/)
  })
})
