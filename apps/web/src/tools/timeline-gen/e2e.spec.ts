/**
 * timeline-gen E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('timeline-gen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/timeline-gen')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/时间线生成/)
  })

  test('示例 → 右侧生成时间线', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('timeline-html')).toContainText('立项')
  })

  test('错误日期 → 右侧显示双语错误', async ({ page }) => {
    await page.getByTestId('input').fill('2026-13-01 | 坏日期')
    await expect(page.getByTestId('timeline-error')).toContainText('无法解析的日期')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('时间线生成')
    await page.getByText('时间线生成').first().click()
    await expect(page).toHaveURL(/\/tools\/timeline-gen$/)
  })
})
