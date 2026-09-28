import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('qr-styling 二维码美化 (#381)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/qr-styling')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/二维码美化/)
  })

  test('点示例渲染 canvas', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('qr-canvas')).toBeVisible()
  })

  test('非法颜色显示错误', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('option-color').fill('red')
    await expect(page.getByRole('alert')).toContainText(/颜色无效/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('二维码美化')
    await page.getByText('二维码美化', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/qr-styling/)
  })
})
