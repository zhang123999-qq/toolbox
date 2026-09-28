/**
 * avatar E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('avatar 头像生成 (#384)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/avatar')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/头像/)
  })

  test('点示例后输出 SVG 头像', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('avatar-svg')).toBeVisible()
    await expect(page.getByTestId('avatar-svg')).toContainText('张')
  })

  test('非法尺寸显示错误', async ({ page }) => {
    await page.getByTestId('option-size').fill('9999')
    await expect(page.getByTestId('output')).toContainText('尺寸必须是')
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('头像')
    await page.getByText('头像生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/avatar/)
  })
})
