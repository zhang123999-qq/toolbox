/**
 * random-decision E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('random-decision', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/random-decision')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/随机决定/)
  })

  test('示例 → 输出决定结果', async ({ page }) => {
    await page.getByTestId('example').click()
    const output = page.getByTestId('output')
    await expect(output).toContainText('决定结果')
    await expect(output).toContainText('候选项：4')
  })

  test('改抽取个数为 3 → 输出 3 个结果', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('input-count').fill('3')
    await expect(page.getByTestId('output')).toContainText('抽取个数：3')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('随机决定')
    await page.getByText('随机决定').first().click()
    await expect(page).toHaveURL(/\/tools\/random-decision$/)
  })
})
