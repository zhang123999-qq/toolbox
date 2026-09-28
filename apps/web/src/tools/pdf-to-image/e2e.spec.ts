import { expect, test } from '@playwright/test'

test.describe('pdf-to-image PDF 转图片 (#462)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-to-image')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 转图片/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-dpi')).toBeVisible()
    await expect(page.getByTestId('opt-pages')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 转图片')
    await page.getByText('PDF 转图片', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-to-image/)
  })
})
