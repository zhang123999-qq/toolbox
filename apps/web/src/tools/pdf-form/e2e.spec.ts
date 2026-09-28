import { expect, test } from '@playwright/test'

test.describe('pdf-form PDF 表单 (#492)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-form')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 表单/)
  })

  test('投放区可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 表单')
    await page.getByText('PDF 表单', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-form/)
  })
})
