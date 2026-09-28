/**
 * placeholder E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('placeholder 占位图生成 (#387)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/placeholder')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/占位图/)
  })

  test('点示例后输出 300x200 占位图', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('placeholder-svg')).toBeVisible()
    await expect(page.getByTestId('placeholder-svg')).toContainText('300 × 200')
  })

  test('非法尺寸显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('abc')
    await expect(page.getByTestId('output')).toContainText('尺寸格式不正确')
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('占位图')
    await page.getByText('占位图生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/placeholder/)
  })
})
