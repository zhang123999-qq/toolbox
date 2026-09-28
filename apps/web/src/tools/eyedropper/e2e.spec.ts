/**
 * eyedropper E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：系统取色器需要用户交互，CI 环境通常无法完成；
 * 下面只覆盖页面渲染与手动解析。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('eyedropper', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/eyedropper')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/取色器/)
  })

  test('手动输入颜色值 → 解析并展示三行报告', async ({ page }) => {
    await page.getByTestId('input').fill('#ff6b00')
    await page.getByTestId('manual-parse').click()
    await expect(page.getByTestId('result-info')).toContainText('HEX：#ff6b00')
    await expect(page.getByTestId('color-swatch')).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('eyedropper')
    await page.getByText('取色器').first().click()
    await expect(page).toHaveURL(/\/tools\/eyedropper$/)
  })
})
