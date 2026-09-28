/**
 * tetris E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与游戏元素，俄罗斯方块在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('俄罗斯方块 (#846)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/tetris')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/俄罗斯方块/)
  })

  test('棋盘与开始按钮存在', async ({ page }) => {
    await expect(page.getByTestId('tetris-board')).toBeVisible()
    await expect(page.getByTestId('tetris-start')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('俄罗斯方块')
    await expect(page.getByRole('link', { name: /俄罗斯方块/ }).first()).toBeVisible()
  })
})
