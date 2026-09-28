import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('barcode 条形码生成 (#382)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/barcode')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/条形码生成/)
  })

  test('点示例输出 SVG 源码', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('<svg')
  })

  test('非法内容显示错误', async ({ page }) => {
    await page.getByTestId('input').fill('你好')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/非 ASCII/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('条形码')
    await page.getByText('条形码生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/barcode/)
  })
})
