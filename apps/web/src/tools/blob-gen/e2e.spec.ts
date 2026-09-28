import { expect, test } from '@playwright/test'

test.describe('blob-gen Blob 形状生成 (#393)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/blob-gen')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/Blob/)
  })

  test('默认渲染出 SVG 形状', async ({ page }) => {
    await expect(page.locator('#output svg')).toBeVisible()
  })

  test('复杂度越界显示错误', async ({ page }) => {
    await page.getByTestId('option-complexity').fill('99')
    await expect(page.getByTestId('output')).toContainText(/复杂度须在 3–12/)
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('Blob')
    await page.getByText('Blob 形状生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/blob-gen/)
  })
})
