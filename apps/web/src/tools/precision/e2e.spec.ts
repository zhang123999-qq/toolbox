/**
 * precision E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('precision', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/precision')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/数值精度/)
  })

  test('示例 → 输出 0.1+0.2 误差对照', async ({ page }) => {
    await page.getByTestId('example').click()
    const output = page.getByTestId('output')
    await expect(output).toContainText('精确结果（decimal.js）：0.3')
    await expect(output).toContainText('JS 原生浮点结果：0.30000000000000004')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('数值精度')
    await page.getByText('数值精度').first().click()
    await expect(page).toHaveURL(/\/tools\/precision$/)
  })
})
