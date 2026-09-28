import { expect, test } from '@playwright/test'

test.describe('pdf-ocr PDF OCR (#500)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-ocr')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF OCR/)
  })

  test('投放区、语言选项与 CDN 说明可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-chiSim')).toBeVisible()
    await expect(page.getByTestId('opt-eng')).toBeVisible()
    await expect(page.getByTestId('cdn-notice')).toBeVisible()
  })

  test('有 CDN 下载说明', async ({ page }) => {
    await expect(page.getByTestId('cdn-notice')).toContainText(/CDN/)
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF OCR')
    await page.getByText('PDF OCR', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-ocr/)
  })
})
