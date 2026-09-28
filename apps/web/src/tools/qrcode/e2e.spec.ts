import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('qrcode 二维码生成 (#380)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/qrcode')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/二维码生成/)
  })

  test('点示例输出 SVG 源码', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('<svg')
  })

  test('非法尺寸显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('hello')
    await page.getByTestId('option-size').fill('0')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/尺寸无效/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('二维码')
    await page.getByText('二维码生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/qrcode/)
  })
})
