/**
 * regex-tester E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('regex-tester', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/regex-tester')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/正则测试/)
  })

  test('示例 → 输出命中清单与分组', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('共 2 个匹配')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('regex-tester')
    await page.getByText('正则测试').first().click()
    await expect(page).toHaveURL(/\/tools\/regex-tester$/)
  })
})
