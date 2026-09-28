import { expect, test } from '@playwright/test'

test.describe('pdf-watermark PDF 水印 (#487)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-watermark')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 水印/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-type-text')).toBeVisible()
    await expect(page.getByTestId('opt-text')).toBeVisible()
    await expect(page.getByTestId('opt-opacity')).toBeVisible()
    await expect(page.getByTestId('apply')).toBeVisible()
  })

  test('有英文水印限制说明', async ({ page }) => {
    await expect(page.getByTestId('ascii-note')).toBeVisible()
  })

  test('切换图片水印显示图片投放区', async ({ page }) => {
    await page.getByTestId('opt-type-image').click()
    await expect(page.getByTestId('image-dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-scale')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 水印')
    await page.getByText('PDF 水印', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-watermark/)
  })
})
