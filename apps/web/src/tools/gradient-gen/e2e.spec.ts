import { expect, test } from '@playwright/test'

test.describe('gradient-gen 渐变生成 (#388)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/gradient-gen')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/渐变/)
  })

  test('点示例输出线性渐变 CSS', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText(
      'linear-gradient(135deg, #ff5b8a, #6a5cff)',
    )
  })

  test('非法颜色显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('#bad')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/颜色格式非法/)
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('渐变')
    await page.getByText('渐变生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/gradient-gen/)
  })
})
