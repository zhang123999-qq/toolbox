/**
 * robots E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('robots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/robots')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/robots\.txt 生成/)
  })

  test('填入规则后输出 User-agent 分组', async ({ page }) => {
    await page.getByTestId('input').fill('* disallow /private\n* allow /private/public')
    await expect(page.getByTestId('output')).toContainText('User-agent: *')
    await expect(page.getByTestId('output')).toContainText('Disallow: /private')
  })

  test('非法指令 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('* deny /private')
    await expect(page.getByTestId('output')).toContainText('指令必须是 allow 或 disallow')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('robots')
    await page.getByText('robots.txt 生成').first().click()
    await expect(page).toHaveURL(/\/tools\/robots$/)
  })
})
