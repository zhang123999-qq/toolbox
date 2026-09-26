/**
 * ini-parse E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ini-parse', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/ini-parse`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/INI/)
  })

  test('示例 → 转换 → 输出 JSON', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toHaveText(/"port": 8080/)
    await expect(page.getByTestId('output')).toHaveText(/"enabled": true/)
  })

  test('非法输入时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('no-separator-here')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ini')
    await page.getByText('INI 解析').first().click()
    await expect(page).toHaveURL(/\/tools\/ini-parse$/)
  })
})
