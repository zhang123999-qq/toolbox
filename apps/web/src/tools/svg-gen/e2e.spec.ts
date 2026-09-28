import { expect, test } from '@playwright/test'

test.describe('svg-gen SVG 图案生成 (#392)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/svg-gen')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/SVG 图案/)
  })

  test('默认输出点阵 SVG', async ({ page }) => {
    await expect(page.getByTestId('output')).toContainText('<svg')
    await expect(page.getByTestId('output')).toContainText('<circle')
  })

  test('非法颜色显示错误', async ({ page }) => {
    await page.getByTestId('option-fgColor').fill('red')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/前景色格式非法/)
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('SVG 图案')
    await page.getByText('SVG 图案生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/svg-gen/)
  })
})
