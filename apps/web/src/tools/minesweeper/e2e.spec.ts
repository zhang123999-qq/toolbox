/**
 * minesweeper E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与游戏元素，扫雷在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('扫雷 (#845)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/minesweeper')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/扫雷/)
  })

  test('棋盘与难度选择存在', async ({ page }) => {
    await expect(page.getByTestId('ms-board')).toBeVisible()
    await expect(page.getByTestId('ms-diff')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('扫雷')
    await expect(page.getByRole('link', { name: /扫雷/ }).first()).toBeVisible()
  })
})
