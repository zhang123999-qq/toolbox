/**
 * lottery E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('lottery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/lottery')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/抽签/)
  })

  test('示例 → 输出中奖名单', async ({ page }) => {
    await page.getByTestId('example').click()
    const output = page.getByTestId('output')
    await expect(output).toContainText('中奖名单')
    await expect(output).toContainText('候选人数：5')
  })

  test('抽取人数大于名单人数（不放回）→ 错误态', async ({ page }) => {
    await page.getByTestId('input').fill('张三\n李四')
    await page.getByTestId('input-count').fill('5')
    await expect(page.getByTestId('output')).toContainText('不能大于名单人数')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('抽签')
    await page.getByText('抽签').first().click()
    await expect(page).toHaveURL(/\/tools\/lottery$/)
  })
})
