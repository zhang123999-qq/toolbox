/**
 * tarot E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：A 级工具；E2E 仅校验页面可达与表单元素，抽牌在本地完成。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('塔罗 (#840)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/tarot')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/塔罗/)
  })

  test('牌阵按钮与抽牌按钮存在', async ({ page }) => {
    await expect(page.getByTestId('tarot-spread-three')).toBeVisible()
    await expect(page.getByTestId('tarot-draw')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('塔罗')
    await expect(page.getByRole('link', { name: /塔罗/ }).first()).toBeVisible()
  })
})
