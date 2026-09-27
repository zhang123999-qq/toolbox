/**
 * world-clock E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('world-clock', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/world-clock')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/世界时钟/)
  })

  test('示例 → 运行 → 输出多时区当前时间', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('Asia/Shanghai')
    await expect(page.getByTestId('output')).toContainText(/UTC[+-]\d{2}:\d{2}/)
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('world-clock')
    await page.getByText('世界时钟').first().click()
    await expect(page).toHaveURL(/\/tools\/world-clock$/)
  })
})
