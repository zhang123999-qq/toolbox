/**
 * cert-parser E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('cert-parser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/cert-parser')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/证书解析/)
  })

  test('示例 → 运行后输出主体字段', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('主体（Subject）')
  })

  test('非法 PEM 时输出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('not a pem')
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })
})
