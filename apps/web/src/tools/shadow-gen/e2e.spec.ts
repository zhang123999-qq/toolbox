import { expect, test } from '@playwright/test'

test.describe('shadow-gen 阴影生成 (#389)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/shadow-gen')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/阴影/)
  })

  test('默认输出柔和阴影 CSS', async ({ page }) => {
    await expect(page.getByTestId('output')).toContainText('box-shadow: 0px 10px 20px 0px')
  })

  test('层数越界显示错误', async ({ page }) => {
    await page.getByTestId('option-layers').fill('9')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
    await expect(page.getByTestId('output')).toContainText(/须在 1–5/)
  })

  test('首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('阴影')
    await page.getByText('阴影生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/shadow-gen/)
  })
})
