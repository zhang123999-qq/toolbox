/**
 * cron-generator E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('cron-generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/cron-generator')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Cron 生成/)
  })

  test('示例 → 输出每分钟的 cron', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('* * * * *')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('cron')
    await page.getByText('Cron 生成').first().click()
    await expect(page).toHaveURL(/\/tools\/cron-generator$/)
  })
})
